import { MarketSeries, PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'
import { SeriesDefinition } from './seriesRegistry'

const FRED_OBSERVATIONS_URL = 'https://api.stlouisfed.org/fred/series/observations'
const DEFAULT_OBSERVATION_START = '2000-01-01'
const DEFAULT_TTL_HOURS = 12
const UPSERT_BATCH_SIZE = 500
// FRED revises published values after the fact, so an incremental refresh re-requests a
// trailing window rather than starting exactly at the newest stored observation. Without
// it, a correction to an already-stored value would never be picked up.
const REVISION_OVERLAP_DAYS = 30
const MISSING_VALUE = '.'

interface FredObservation {
  date: string;
  value: string;
}

interface FredObservationsResponse {
  observations?: FredObservation[];
  error_message?: string;
}

export interface ParsedObservation {
  date: Date;
  value: number;
}

export const ttlHours = (): number => {
  const configured = Number(process.env.FRED_TTL_HOURS)

  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_HOURS
}

export const isStale = (lastFetchedAt: Date | null): boolean => {
  if (!lastFetchedAt) return true

  return Date.now() - lastFetchedAt.getTime() > ttlHours() * 60 * 60 * 1000
}

const requireApiKey = (): string => {
  const apiKey = process.env.FRED_API_KEY

  if (!apiKey) throw new Error('FRED_API_KEY is not configured; market rates data is unavailable.')

  return apiKey
}

export const parseObservations = (observations: FredObservation[]): ParsedObservation[] =>
  observations.reduce<ParsedObservation[]>((parsed, observation) => {
    // FRED reports missing prints (holidays, non-trading days) as '.' -- skip, never coerce to 0
    if (!observation || observation.value === MISSING_VALUE) return parsed

    const value = Number(observation.value)
    const date = new Date(`${observation.date}T00:00:00.000Z`)

    if (!Number.isFinite(value) || Number.isNaN(date.getTime())) return parsed

    parsed.push({
      date,
      value
    })

    return parsed
  }, [])

export const fetchObservations = async (
  fredId: string,
  observationStart: string = DEFAULT_OBSERVATION_START
): Promise<ParsedObservation[]> => {
  const params = new URLSearchParams({
    series_id: fredId,
    api_key: requireApiKey(),
    file_type: 'json',
    observation_start: observationStart
  })

  const response = await fetch(`${FRED_OBSERVATIONS_URL}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`FRED request for ${fredId} failed with status ${response.status}`)
  }

  const body = await response.json() as FredObservationsResponse

  if (body.error_message) throw new Error(`FRED request for ${fredId} failed: ${body.error_message}`)

  return parseObservations(body.observations ?? [])
}

const persistObservations = async (
  prisma: PrismaClient,
  seriesId: number,
  observations: ParsedObservation[]
) => {
  for (let index = 0; index < observations.length; index += UPSERT_BATCH_SIZE) {
    const batch = observations.slice(index, index + UPSERT_BATCH_SIZE)

    await prisma.$transaction(batch.map(observation => prisma.marketObservation.upsert({
      where: {
        seriesId_date: {
          seriesId,
          date: observation.date
        }
      },
      update: { value: observation.value },
      create: {
        seriesId,
        date: observation.date,
        value: observation.value
      }
    })))
  }
}

/**
 * The date an incremental refresh should request from: the series' newest stored
 * observation, less the revision overlap. A series with no observations yet has no
 * anchor, so it falls back to a full history fetch.
 */
const resolveObservationStart = async (
  prisma: PrismaClient,
  seriesId: number
): Promise<string> => {
  const newest = await prisma.marketObservation.findFirst({
    where: { seriesId },
    orderBy: { date: 'desc' },
    select: { date: true }
  })

  if (!newest) return DEFAULT_OBSERVATION_START

  const start = new Date(newest.date)

  start.setUTCDate(start.getUTCDate() - REVISION_OVERLAP_DAYS)

  // Never request earlier than the configured floor.
  const floor = new Date(`${DEFAULT_OBSERVATION_START}T00:00:00.000Z`)

  return (start < floor ? floor : start).toISOString().slice(0, 10)
}

export interface RefreshEntry {
  series: MarketSeries;
  definition: SeriesDefinition;
}

/**
 * Refreshes every stale, non-derived series. Each request starts from that series' newest
 * stored observation less REVISION_OVERLAP_DAYS, so a refresh moves tens of rows rather
 * than the full history while still absorbing FRED's revisions to recent values. A series
 * with no observations yet fetches from DEFAULT_OBSERVATION_START.
 *
 * The FRED requests all run concurrently; the writes are then applied one series at a time
 * because SQLite serialises writers anyway and parallel write transactions exhaust the
 * connection pool. A failing series is logged and skipped so the remaining series can still
 * be served.
 *
 * Returns the number of series that were successfully refreshed.
 */
export const refreshStaleSeries = async (
  prisma: PrismaClient,
  entries: RefreshEntry[]
): Promise<number> => {
  const stale = entries.filter(entry => !entry.definition.derived && isStale(entry.series.lastFetchedAt))

  if (!stale.length) return 0

  const starts = await Promise.all(stale.map(entry => resolveObservationStart(prisma, entry.series.id)))

  const fetched = await Promise.allSettled(
    stale.map((entry, index) => fetchObservations(entry.definition.fredId, starts[index]))
  )

  const failures: unknown[] = []
  let refreshed = 0

  for (let index = 0; index < stale.length; index += 1) {
    const result = fetched[index]
    const { series } = stale[index]

    if (result.status === 'rejected') {
      failures.push(result.reason)
      continue
    }

    try {
      await persistObservations(prisma, series.id, result.value)

      await prisma.marketSeries.update({
        where: { id: series.id },
        data: { lastFetchedAt: new Date() }
      })

      refreshed += 1
    } catch (error) {
      failures.push(error)
    }
  }

  failures.forEach(failure => console.error('Failed to refresh FRED series:', failure))

  // Only surface an error when nothing could be refreshed -- a partial refresh still serves data
  if (refreshed === 0) {
    const [ first ] = failures

    throw new Error(`Unable to refresh market data from FRED: ${(first as Error)?.message ?? 'unknown error'}`)
  }

  return refreshed
}

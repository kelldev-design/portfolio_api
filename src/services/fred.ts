import { MarketSeries, PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'
import { SeriesDefinition } from './seriesRegistry'

const FRED_OBSERVATIONS_URL = 'https://api.stlouisfed.org/fred/series/observations'
const DEFAULT_OBSERVATION_START = '2000-01-01'
const DEFAULT_TTL_HOURS = 12
const DEFAULT_POLL_TTL_HOURS = 1
// FRED loads the DGS series after the Fed's H.15 release at 4:15pm ET, which is 20:15 UTC
// under EDT and 21:15 UTC under EST. Treating that day's load as done only from 22:00 UTC
// clears both without a timezone database, and 22:00 UTC is still the same calendar day in
// ET, so the UTC date identifies the release. Which VALUE that release carries is a
// separate question -- see lastExpectedPrintDate.
const PRINT_RELEASE_HOUR_UTC = 22
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

const readTtlHours = (configured: string | undefined, fallback: number): number => {
  const hours = Number(configured)

  return Number.isFinite(hours) && hours > 0 ? hours : fallback
}

/**
 * How long a series stays fresh once it already holds the newest print FRED is expected to
 * have published. Nothing new can arrive until the next release, so this can be generous.
 */
export const ttlHours = (): number => readTtlHours(process.env.FRED_TTL_HOURS, DEFAULT_TTL_HOURS)

/**
 * How long a series stays fresh while the newest expected print is still missing. Shorter,
 * so a new print is picked up soon after FRED publishes it rather than at the next full TTL.
 * Clamped to `ttlHours()` so a deliberately short settled TTL is never slowed down by it.
 */
export const pollTtlHours = (): number =>
  Math.min(readTtlHours(process.env.FRED_POLL_TTL_HOURS, DEFAULT_POLL_TTL_HOURS), ttlHours())

// 0 is Sunday and 6 is Saturday; neither ever carries a print
const isWeekend = (date: Date): boolean => date.getUTCDay() === 0 || date.getUTCDay() === 6

const previousWeekday = (date: Date): Date => {
  const previous = new Date(date)

  do {
    previous.setUTCDate(previous.getUTCDate() - 1)
  } while (isWeekend(previous))

  return previous
}

/**
 * The most recent date FRED is expected to hold a value for, as a UTC midnight Date to
 * match how observations are stored.
 *
 * FRED loads the DGS series from the Fed's H.15 release, and runs one business day behind:
 * the update on any given business day carries the PREVIOUS business day's value, not that
 * day's. Observed directly -- FRED's own "last updated" stamp for DGS10 read
 * 2026-09-14 3:16pm CDT, and that update is what first carried Friday 2026-09-11.
 *
 * So resolving this is two steps: find the latest weekday whose release has run, then step
 * back one business day to the value that release actually delivered.
 *
 * Market holidays are deliberately not modelled -- there is no print to find on one, so a
 * holiday simply keeps the polling TTL in force until the next real print lands.
 */
export const lastExpectedPrintDate = (now: Date = new Date()): Date => {
  const release = new Date(now)

  if (release.getUTCHours() < PRINT_RELEASE_HOUR_UTC) release.setUTCDate(release.getUTCDate() - 1)

  release.setUTCHours(0, 0, 0, 0)

  while (isWeekend(release)) release.setUTCDate(release.getUTCDate() - 1)

  return previousWeekday(release)
}

export type Freshness = 'fresh' | 'stale' | 'undecided'

/**
 * Classifies a series on elapsed time alone. `undecided` means the answer depends on whether
 * the series is already holding the newest expected print, which costs a query to find out.
 */
export const freshness = (lastFetchedAt: Date | null): Freshness => {
  if (!lastFetchedAt) return 'stale'

  const elapsedHours = (Date.now() - lastFetchedAt.getTime()) / (60 * 60 * 1000)

  if (elapsedHours <= pollTtlHours()) return 'fresh'

  return elapsedHours > ttlHours() ? 'stale' : 'undecided'
}

export const isStale = (lastFetchedAt: Date | null, newestObservation?: Date | null): boolean => {
  const state = freshness(lastFetchedAt)

  if (state !== 'undecided') return state === 'stale'

  // Past the polling TTL but short of the settled one: refresh only while the newest print
  // FRED should have is still missing, so a series that is already current is left alone.
  return !newestObservation || newestObservation.getTime() < lastExpectedPrintDate().getTime()
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

const newestObservationDate = async (
  prisma: PrismaClient,
  seriesId: number
): Promise<Date | null> => {
  const newest = await prisma.marketObservation.findFirst({
    where: { seriesId },
    orderBy: { date: 'desc' },
    select: { date: true }
  })

  return newest?.date ?? null
}

/**
 * The date an incremental refresh should request from: the series' newest stored
 * observation, less the revision overlap. A series with no observations yet has no
 * anchor, so it falls back to a full history fetch.
 */
const resolveObservationStart = (newest: Date | null): string => {
  if (!newest) return DEFAULT_OBSERVATION_START

  const start = new Date(newest)

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
 * Staleness is publication-aware: a series that already holds the newest print FRED is
 * expected to have keeps the long TTL, while one that is behind is rechecked on the short
 * polling TTL. Deciding that needs the series' newest observation, which is read only when
 * the clock alone cannot settle it -- and is then reused as the fetch's start anchor, so a
 * refresh costs no more queries than before.
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
  const candidates = entries.filter(entry => !entry.definition.derived)

  const assessed = await Promise.all(candidates.map(async entry => {
    const state = freshness(entry.series.lastFetchedAt)

    // A fresh series is skipped outright, so its newest observation is never worth a query
    const newest = state === 'fresh' ? null : await newestObservationDate(prisma, entry.series.id)

    return {
      entry,
      newest,
      stale: state === 'undecided' ? isStale(entry.series.lastFetchedAt, newest) : state === 'stale'
    }
  }))

  const stale = assessed.filter(assessment => assessment.stale)

  if (!stale.length) return 0

  const fetched = await Promise.allSettled(
    stale.map(({ entry, newest }) => fetchObservations(
      entry.definition.fredId,
      resolveObservationStart(newest)
    ))
  )

  const failures: unknown[] = []
  let refreshed = 0

  for (let index = 0; index < stale.length; index += 1) {
    const result = fetched[index]
    const { series } = stale[index].entry

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

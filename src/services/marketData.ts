import { PrismaClient } from '@prisma/client'
import { RefreshEntry, refreshStaleSeries } from './fred'
import {
  SeriesDefinition,
  curveSeries,
  findSeries,
  seriesRegistry,
  syncSeriesRegistry,
  withDerivedDependencies
} from './seriesRegistry'

export interface ObservationResult {
  date: string;
  value: number;
}

export interface MarketSeriesResult {
  fredId: string;
  label: string;
  category: string;
  unit: string;
  lastFetchedAt: string | null;
  observations: ObservationResult[];
  /**
   * The two most recent observations for the series overall, ignoring any from/to
   * filter, so `latest`/`previous` always describe the current value and its change
   * even when the same query asks for a historical window of `observations`.
   */
  recent: ObservationResult[];
}

export interface YieldCurvePointResult {
  fredId: string;
  label: string;
  months: number;
  value: number | null;
}

export interface YieldCurveComparisonResult {
  key: string;
  label: string;
  date: string;
  points: YieldCurvePointResult[];
}

export interface YieldCurveResult {
  date: string;
  points: YieldCurvePointResult[];
  comparisons: YieldCurveComparisonResult[];
}

interface SeriesFilters {
  ids?: string[] | null;
  category?: string | null;
  from?: string | null;
  to?: string | null;
}

export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

const parseBoundary = (value?: string | null): Date | undefined => {
  if (!value) return undefined

  const date = new Date(`${value}T00:00:00.000Z`)

  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date '${value}'; expected format YYYY-MM-DD`)

  return date
}

const dateFilter = (from?: string | null, to?: string | null) => {
  const gte = parseBoundary(from)
  const lte = parseBoundary(to)

  if (!gte && !lte) return undefined

  return {
    ...gte ? { gte } : {},
    ...lte ? { lte } : {}
  }
}

const selectDefinitions = (ids?: string[] | null, category?: string | null): SeriesDefinition[] => {
  if (ids?.length) {
    return ids.map(id => {
      const definition = findSeries(id)

      if (!definition) throw new Error(`Unknown market series '${id}'`)

      return definition
    })
  }

  if (category) {
    const matches = seriesRegistry.filter(series => series.category.toLowerCase() === category.toLowerCase())

    if (!matches.length) throw new Error(`Unknown market series category '${category}'`)

    return matches
  }

  return seriesRegistry
}

/**
 * Upserts the registry, then refreshes any of the given series whose data has gone stale.
 * Returns the persisted rows keyed by fredId.
 */
const prepareSeries = async (prisma: PrismaClient, definitions: SeriesDefinition[]) => {
  const rows = await syncSeriesRegistry(prisma)
  const needed = withDerivedDependencies(definitions)

  const entries = needed.reduce<RefreshEntry[]>((collected, definition) => {
    const series = rows.get(definition.fredId)

    if (series) {
      collected.push({
        series,
        definition
      })
    }

    return collected
  }, [])

  const refreshed = await refreshStaleSeries(prisma, entries)

  if (!refreshed) return rows

  // Re-read so lastFetchedAt reflects the refresh that just happened
  const updated = await prisma.marketSeries.findMany()

  return new Map(updated.map(row => [ row.fredId, row ]))
}

const loadObservations = async (
  prisma: PrismaClient,
  seriesIds: number[],
  filters: SeriesFilters
): Promise<Map<number, ObservationResult[]>> => {
  const date = dateFilter(filters.from, filters.to)

  const observations = await prisma.marketObservation.findMany({
    where: {
      seriesId: { in: seriesIds },
      ...date ? { date } : {}
    },
    orderBy: [{ seriesId: 'asc' }, { date: 'asc' }]
  })

  return observations.reduce((grouped, observation) => {
    const existing = grouped.get(observation.seriesId) ?? []

    existing.push({
      date: toIsoDate(observation.date),
      value: observation.value
    })
    grouped.set(observation.seriesId, existing)

    return grouped
  }, new Map<number, ObservationResult[]>())
}

// Enough trailing prints that a derived series still finds two dates common to both
// of its inputs, even across holidays where only one of them printed
const RECENT_WINDOW = 10

/**
 * Loads the trailing observations for each series ignoring any from/to filter, so
 * `latest`/`previous` can report the true current value rather than the last value
 * inside a requested window.
 */
const loadRecentObservations = async (
  prisma: PrismaClient,
  seriesIds: number[]
): Promise<Map<number, ObservationResult[]>> => {
  const perSeries = await Promise.all(seriesIds.map(async seriesId => {
    const observations = await prisma.marketObservation.findMany({
      where: { seriesId },
      orderBy: { date: 'desc' },
      take: RECENT_WINDOW
    })

    return [
      seriesId,
      observations.reverse().map(observation => ({
        date: toIsoDate(observation.date),
        value: observation.value
      }))
    ] as const
  }))

  return new Map(perSeries)
}

const deriveObservations = (
  minuend: ObservationResult[],
  subtrahend: ObservationResult[]
): ObservationResult[] => {
  const subtrahendByDate = new Map(subtrahend.map(observation => [ observation.date, observation.value ]))

  return minuend.reduce<ObservationResult[]>((derived, observation) => {
    const other = subtrahendByDate.get(observation.date)

    if (other === undefined) return derived

    derived.push({
      date: observation.date,
      value: Number((observation.value - other).toFixed(4))
    })

    return derived
  }, [])
}

export const getMarketSeries = async (
  prisma: PrismaClient,
  filters: SeriesFilters
): Promise<MarketSeriesResult[]> => {
  const definitions = selectDefinitions(filters.ids, filters.category)
  const rows = await prepareSeries(prisma, definitions)
  const needed = withDerivedDependencies(definitions)

  const seriesIds = needed
    .map(definition => rows.get(definition.fredId)?.id)
    .filter((id): id is number => typeof id === 'number')

  const filtered = Boolean(filters.from || filters.to)
  const observationsBySeriesId = await loadObservations(prisma, seriesIds, filters)

  // Only pay for the extra reads when the window could hide the true latest print
  const recentBySeriesId = filtered
    ? await loadRecentObservations(prisma, seriesIds)
    : observationsBySeriesId

  const byFredId = (bySeriesId: Map<number, ObservationResult[]>) =>
    new Map(needed.map(definition => {
      const id = rows.get(definition.fredId)?.id

      return [ definition.fredId, (id !== undefined && bySeriesId.get(id)) || [] ]
    }))

  const observationsByFredId = byFredId(observationsBySeriesId)
  const recentByFredId = filtered ? byFredId(recentBySeriesId) : observationsByFredId

  const resolveSeries = (definition: SeriesDefinition, source: Map<string, ObservationResult[]>) =>
    definition.derived
      ? deriveObservations(
        source.get(definition.derived.minuend) ?? [],
        source.get(definition.derived.subtrahend) ?? []
      )
      : source.get(definition.fredId) ?? []

  return definitions.map(definition => {
    // A derived series is never fetched itself, so report the freshness of its inputs
    const freshnessIds = definition.derived
      ? [ definition.derived.minuend, definition.derived.subtrahend ]
      : [ definition.fredId ]

    const fetchedDates = freshnessIds.map(fredId => rows.get(fredId)?.lastFetchedAt ?? null)

    const fetchedAt = fetchedDates.some(fetched => !fetched)
      ? null
      : fetchedDates.reduce((oldest, current) =>
        !oldest || current && current < oldest ? current : oldest, null as Date | null)

    const observations = resolveSeries(definition, observationsByFredId)
    const recent = resolveSeries(definition, recentByFredId)

    return {
      fredId: definition.fredId,
      label: definition.label,
      category: definition.category,
      unit: definition.unit,
      lastFetchedAt: fetchedAt?.toISOString() ?? null,
      observations,
      recent: recent.slice(-2)
    }
  })
}

// Comparison curves rendered alongside the current one. Offsets are in calendar days;
// each resolves to the most recent print on or before that date, which lands on the
// previous trading day across weekends and holidays without a market calendar.
const CURVE_COMPARISONS: { key: string; label: string; daysBack: number }[] = [
  {
    key: 'dayAgo',
    label: '1 Day Ago',
    daysBack: 1
  },
  {
    key: 'weekAgo',
    label: '1 Week Ago',
    daysBack: 7
  }
]

const shiftDays = (date: Date, days: number): Date => {
  const shifted = new Date(date)

  shifted.setUTCDate(shifted.getUTCDate() - days)

  return shifted
}

/**
 * Resolves one curve snapshot: the most recent observation date on or before `boundary`
 * (or the latest overall when omitted), and every curve tenor's value on that date.
 * Returns null when no observation exists in range.
 */
const loadCurveSnapshot = async (
  prisma: PrismaClient,
  seriesIds: number[],
  seriesIdToFredId: Map<number, string>,
  boundary?: Date
): Promise<{ date: Date; points: YieldCurvePointResult[] } | null> => {
  const anchor = await prisma.marketObservation.findFirst({
    where: {
      seriesId: { in: seriesIds },
      // Fall back to the most recent print on or before the requested date -- markets are
      // closed on weekends and holidays, so an exact match is not guaranteed
      ...boundary ? { date: { lte: boundary } } : {}
    },
    orderBy: { date: 'desc' }
  })

  if (!anchor) return null

  const observations = await prisma.marketObservation.findMany({
    where: {
      seriesId: { in: seriesIds },
      date: anchor.date
    }
  })

  const valueByFredId = new Map(observations.reduce<[ string, number ][]>((pairs, observation) => {
    const fredId = seriesIdToFredId.get(observation.seriesId)

    if (fredId) pairs.push([ fredId, observation.value ])

    return pairs
  }, []))

  return {
    date: anchor.date,
    points: curveSeries.map(definition => ({
      fredId: definition.fredId,
      label: definition.label,
      months: definition.months ?? 0,
      value: valueByFredId.get(definition.fredId) ?? null
    }))
  }
}

export const getYieldCurve = async (
  prisma: PrismaClient,
  date?: string | null
): Promise<YieldCurveResult> => {
  const rows = await prepareSeries(prisma, curveSeries)

  const seriesIdToFredId = new Map(curveSeries
    .map(definition => [ rows.get(definition.fredId)?.id, definition.fredId ] as const)
    .filter((pair): pair is readonly [ number, string ] => typeof pair[0] === 'number'))

  const seriesIds = [ ...seriesIdToFredId.keys() ]
  const requested = date ? parseBoundary(date) : undefined

  const current = await loadCurveSnapshot(prisma, seriesIds, seriesIdToFredId, requested)

  if (!current) {
    throw new Error(date
      ? `No yield curve data available on or before ${date}`
      : 'No yield curve data available')
  }

  const snapshots = await Promise.all(CURVE_COMPARISONS.map(comparison =>
    loadCurveSnapshot(prisma, seriesIds, seriesIdToFredId, shiftDays(current.date, comparison.daysBack))))

  const comparisons = CURVE_COMPARISONS.reduce<YieldCurveComparisonResult[]>((collected, comparison, index) => {
    const snapshot = snapshots[index]

    // Drop a comparison that resolved onto a date already shown -- sparse history can
    // otherwise emit two identical curves under different labels.
    if (!snapshot) return collected

    const seen = [ current.date, ...collected.map(entry => new Date(`${entry.date}T00:00:00.000Z`)) ]

    if (seen.some(date => date.getTime() === snapshot.date.getTime())) return collected

    collected.push({
      key: comparison.key,
      label: comparison.label,
      date: toIsoDate(snapshot.date),
      points: snapshot.points
    })

    return collected
  }, [])

  return {
    date: toIsoDate(current.date),
    points: current.points,
    comparisons
  }
}

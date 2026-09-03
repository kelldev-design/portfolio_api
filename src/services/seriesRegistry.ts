import { PrismaClient } from '@prisma/client'
import { MarketCategories } from '../types/types'

export interface DerivedDefinition {
  minuend: string;
  subtrahend: string;
}

export interface SeriesDefinition {
  fredId: string;
  label: string;
  category: MarketCategories;
  unit: string;
  months?: number;
  derived?: DerivedDefinition;
}

const percent = 'percent'

export const seriesRegistry: SeriesDefinition[] = [
  {
    fredId: 'DGS1MO',
    label: '1 Month',
    category: MarketCategories.Curve,
    unit: percent,
    months: 1
  },
  {
    fredId: 'DGS3MO',
    label: '3 Month',
    category: MarketCategories.Curve,
    unit: percent,
    months: 3
  },
  {
    fredId: 'DGS6MO',
    label: '6 Month',
    category: MarketCategories.Curve,
    unit: percent,
    months: 6
  },
  {
    fredId: 'DGS1',
    label: '1 Year',
    category: MarketCategories.Curve,
    unit: percent,
    months: 12
  },
  {
    fredId: 'DGS2',
    label: '2 Year',
    category: MarketCategories.Curve,
    unit: percent,
    months: 24
  },
  {
    fredId: 'DGS3',
    label: '3 Year',
    category: MarketCategories.Curve,
    unit: percent,
    months: 36
  },
  {
    fredId: 'DGS5',
    label: '5 Year',
    category: MarketCategories.Curve,
    unit: percent,
    months: 60
  },
  {
    fredId: 'DGS7',
    label: '7 Year',
    category: MarketCategories.Curve,
    unit: percent,
    months: 84
  },
  {
    fredId: 'DGS10',
    label: '10 Year',
    category: MarketCategories.Curve,
    unit: percent,
    months: 120
  },
  {
    fredId: 'DGS20',
    label: '20 Year',
    category: MarketCategories.Curve,
    unit: percent,
    months: 240
  },
  {
    fredId: 'DGS30',
    label: '30 Year',
    category: MarketCategories.Curve,
    unit: percent,
    months: 360
  },
  {
    fredId: 'T10Y2Y',
    label: '10Y minus 2Y',
    category: MarketCategories.Spread,
    unit: percent
  },
  {
    fredId: 'T10Y3M',
    label: '10Y minus 3M',
    category: MarketCategories.Spread,
    unit: percent
  },
  {
    fredId: 'SPREAD_5S30S',
    label: '30Y minus 5Y',
    category: MarketCategories.Spread,
    unit: percent,
    derived: {
      minuend: 'DGS30',
      subtrahend: 'DGS5'
    }
  },
  {
    fredId: 'T5YIE',
    label: '5Y Breakeven Inflation',
    category: MarketCategories.Inflation,
    unit: percent
  },
  {
    fredId: 'T10YIE',
    label: '10Y Breakeven Inflation',
    category: MarketCategories.Inflation,
    unit: percent
  },
  {
    fredId: 'T5YIFR',
    label: '5Y5Y Forward Inflation Expectation',
    category: MarketCategories.Inflation,
    unit: percent
  },
  {
    fredId: 'DFII5',
    label: '5Y Real Yield (TIPS)',
    category: MarketCategories.Inflation,
    unit: percent
  },
  {
    fredId: 'DFII10',
    label: '10Y Real Yield (TIPS)',
    category: MarketCategories.Inflation,
    unit: percent
  },
  {
    fredId: 'DFII30',
    label: '30Y Real Yield (TIPS)',
    category: MarketCategories.Inflation,
    unit: percent
  },
  {
    fredId: 'DFEDTARU',
    label: 'Fed Funds Target Upper',
    category: MarketCategories.Policy,
    unit: percent
  },
  {
    fredId: 'DFEDTARL',
    label: 'Fed Funds Target Lower',
    category: MarketCategories.Policy,
    unit: percent
  },
  {
    fredId: 'EFFR',
    label: 'Effective Fed Funds Rate',
    category: MarketCategories.Policy,
    unit: percent
  },
  {
    fredId: 'SOFR',
    label: 'SOFR',
    category: MarketCategories.Policy,
    unit: percent
  }
]

export const curveSeries: SeriesDefinition[] = seriesRegistry
  .filter(series => series.category === MarketCategories.Curve && series.months !== undefined)
  .sort((a, b) => (a.months ?? 0) - (b.months ?? 0))

export const findSeries = (fredId: string): SeriesDefinition | undefined =>
  seriesRegistry.find(series => series.fredId === fredId)

/**
 * Expands a list of registry entries to include the underlying series that any
 * derived entry depends on, so those are always fetched alongside it.
 */
export const withDerivedDependencies = (series: SeriesDefinition[]): SeriesDefinition[] => {
  const byId = new Map<string, SeriesDefinition>()

  series.forEach(entry => {
    byId.set(entry.fredId, entry)

    if (!entry.derived) return

    ;[ entry.derived.minuend, entry.derived.subtrahend ].forEach(dependencyId => {
      const dependency = findSeries(dependencyId)

      if (dependency && !byId.has(dependencyId)) byId.set(dependencyId, dependency)
    })
  })

  return [ ...byId.values() ]
}

/**
 * Upserts every registry entry so the DB never needs a manual seed step.
 * Returns the persisted rows keyed by fredId.
 */
export const syncSeriesRegistry = async (prisma: PrismaClient) => {
  const rows = await Promise.all(seriesRegistry.map(series => prisma.marketSeries.upsert({
    where: { fredId: series.fredId },
    update: {
      label: series.label,
      category: series.category,
      unit: series.unit
    },
    create: {
      fredId: series.fredId,
      label: series.label,
      category: series.category,
      unit: series.unit
    }
  })))

  return new Map(rows.map(row => [ row.fredId, row ]))
}

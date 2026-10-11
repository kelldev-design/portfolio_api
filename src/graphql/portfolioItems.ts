import { Prisma } from '@prisma/client'

/** The relations every portfolio item is loaded with before it is returned. */
export const portfolioItemInclude = Prisma.validator<Prisma.PortfolioItemInclude>()({
  products: true,
  links: {
    select: {
      id: true,
      url: true,
      label: true,
      type: true,
      isInternal: true
    }
  },
  projectImages: {
    include: { projectImage: true },
    orderBy: { position: 'asc' }
  },
  primaryImage: true,
  homeImage: true,
  categories: true
})

/** A portfolio item as loaded with portfolioItemInclude: the parent of the PortfolioItem resolvers. */
export type PortfolioItemResult = Prisma.PortfolioItemGetPayload<{ include: typeof portfolioItemInclude }>

/** Site order: sortOrder first, then id so that equal sortOrders stay stable. */
export const portfolioItemOrderBy: Prisma.PortfolioItemOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { id: 'asc' }
]

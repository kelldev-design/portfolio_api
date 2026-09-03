import { LinkTypes } from '../types/types'
import { Resolvers } from '../types/generatedTypes'
import { getMarketSeries, getYieldCurve } from '../services/marketData'

const resolvers: Resolvers = {
  Query: {
    links: (_parent, _args, context) => context.prisma.link.findMany({ include: { type: true } }),
    linkTypes: (_parent, _args, context) => context.prisma.linkType.findMany(),
    categories: (_parent, _args, context) => context.prisma.category.findMany(),
    projectImages: (_parent, _args, context) => context.prisma.projectImage.findMany(),
    products: (_parent, _args, context) => context.prisma.product.findMany(),
    portfolioItems: (_parent, _args, context) => context.prisma.portfolioItem.findMany({
      include: {
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
        projectImages: true,
        primaryImage: true,
        homeImage: true,
        categories: true
      }
    }),
    marketSeries: (_parent, args, context) => getMarketSeries(context.prisma, args),
    yieldCurve: (_parent, args, context) => getYieldCurve(context.prisma, args.date)
  },
  Mutation: {
    createPortfolioItem: async (_parent, args, context) => {
      return context.prisma.portfolioItem.create({
        data: {
          categories: { connect: args.categories.map(id => ({ id })) },
          description: args.description,
          name: args.name,
          homeImage: { connect: { id: args.homeImage } },
          primaryImage: { connect: { id: args.primaryImage } },
          projectId: args.projectId,
          products: { connect: args.products.map(id => ({ id })) },
          projectImages: { connect: args.projectImages.map(id => ({ id })) },
          links: { connect: args.links.map(id => ({ id })) }
        },
        include: {
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
          projectImages: true,
          primaryImage: true,
          homeImage: true,
          categories: true
        }
      })
        .then(res => ({
          code: 200,
          success: true,
          message: 'Success',
          portfolioItem: ({
            ...res,
            projectLinks: [],
            githubLinks: []
          })
        }))
        .catch(error => ({
          code: 500,
          success: false,
          message: error.message ?? 'Error'
        }))
    }
  },
  PortfolioItem: {
    githubLinks: parent => parent?.links?.filter(link => link?.type?.name === LinkTypes.Github) ?? [],
    productLinks: parent => parent?.links?.filter(link => link?.type?.name === LinkTypes.Product) ?? []
  },
  MarketSeries: {
    latest: parent => parent.observations[parent.observations.length - 1] ?? null,
    previous: parent => parent.observations[parent.observations.length - 2] ?? null
  }
}

export default resolvers
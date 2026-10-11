import { LinkTypes } from '../types/types'
import { PortfolioLinkInput, Resolvers } from '../types/generatedTypes'
import { getMarketSeries, getYieldCurve } from '../services/marketData'
import { checkAdminPassword, getAdminCredentials, requireAdmin, signAdminToken } from './auth'
import { trimPortfolioItemInput, validatePortfolioItemInput } from './validation'

const portfolioItemInclude = {
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

const connectOrCreateLinks = (links: PortfolioLinkInput[], typeName: LinkTypes) =>
  links.map(({ isInternal, label, url }) => ({
    where: { url },
    create: {
      type: {
        connectOrCreate: {
          where: { name: typeName },
          create: { name: typeName }
        }
      },
      isInternal,
      label,
      url
    }
  }))

const resolvers: Resolvers = {
  Query: {
    links: (_parent, _args, context) => context.prisma.link.findMany({ include: { type: true } }),
    linkTypes: (_parent, _args, context) => context.prisma.linkType.findMany(),
    categories: (_parent, _args, context) => context.prisma.category.findMany(),
    projectImages: (_parent, _args, context) => context.prisma.projectImage.findMany(),
    products: (_parent, _args, context) => context.prisma.product.findMany(),
    portfolioItems: (_parent, _args, context) => context.prisma.portfolioItem.findMany({ include: portfolioItemInclude }),
    marketSeries: (_parent, args, context) => getMarketSeries(context.prisma, args),
    yieldCurve: (_parent, args, context) => getYieldCurve(context.prisma, args.date)
  },
  Mutation: {
    login: async (_parent, args) => {
      const credentials = getAdminCredentials()
      const isValid = await checkAdminPassword(args.username, args.password)

      if (!credentials || !isValid) {
        return {
          code: 401,
          success: false,
          message: 'Invalid credentials',
          token: null
        }
      }

      return {
        code: 200,
        success: true,
        message: 'Success',
        token: signAdminToken(credentials.username, credentials.jwtSecret)
      }
    },
    createPortfolioItem: async (_parent, args, context) => {
      requireAdmin(context)

      const input = trimPortfolioItemInput(args.input)
      const validationError = validatePortfolioItemInput(input)

      if (validationError) {
        return {
          code: 400,
          success: false,
          message: validationError
        }
      }

      const existing = await context.prisma.portfolioItem.findFirst({ where: { OR: [{ projectId: input.projectId }, { name: input.name }] } })

      if (existing) {
        const conflict = existing.projectId === input.projectId
          ? `projectId "${input.projectId}"`
          : `name "${input.name}"`

        return {
          code: 409,
          success: false,
          message: `A portfolio item with ${conflict} already exists`
        }
      }

      return context.prisma.portfolioItem.create({
        data: {
          categories: {
            connectOrCreate: input.categories.map(name => ({
              where: { name },
              create: { name }
            }))
          },
          description: input.description,
          name: input.name,
          homeImage: {
            connectOrCreate: {
              where: { imageUrl: input.homeImage },
              create: { imageUrl: input.homeImage }
            }
          },
          primaryImage: {
            connectOrCreate: {
              where: { imageUrl: input.primaryImage },
              create: { imageUrl: input.primaryImage }
            }
          },
          projectId: input.projectId,
          products: {
            connectOrCreate: input.products.map(name => ({
              where: { name },
              create: { name }
            }))
          },
          projectImages: {
            connectOrCreate: input.projectImages.map(imageUrl => ({
              where: { imageUrl },
              create: { imageUrl }
            }))
          },
          links: {
            connectOrCreate: [
              ...connectOrCreateLinks(input.githubLinks, LinkTypes.Github),
              ...connectOrCreateLinks(input.productLinks, LinkTypes.Product)
            ]
          }
        },
        include: portfolioItemInclude
      })
        .then(res => ({
          code: 200,
          success: true,
          message: 'Success',
          portfolioItem: res
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
    latest: parent => parent.recent[parent.recent.length - 1] ?? null,
    previous: parent => parent.recent[parent.recent.length - 2] ?? null
  }
}

export default resolvers
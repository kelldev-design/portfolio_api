import { LinkTypes } from '../types/types'
import { Prisma } from '@prisma/client'
import { CreatePortfolioItemInput, PortfolioLinkInput, Resolvers } from '../types/generatedTypes'
import { getMarketSeries, getYieldCurve } from '../services/marketData'
import { checkAdminPassword, getAdminCredentials, requireAdmin, signAdminToken } from './auth'
import { portfolioItemInclude, portfolioItemOrderBy } from './portfolioItems'
import { trimPortfolioItemInput, validatePortfolioItemInput, validateRoomPlanData } from './validation'

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

/**
 * The relations every portfolio item write sets from its input, apart from links. Each
 * category, product and image is connected when it already exists and created otherwise.
 * Gallery images are stored with their index in the input as their position.
 */
const portfolioItemRelations = (input: CreatePortfolioItemInput) => ({
  categories: {
    connectOrCreate: input.categories.map(name => ({
      where: { name },
      create: { name }
    }))
  },
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
  products: {
    connectOrCreate: input.products.map(name => ({
      where: { name },
      create: { name }
    }))
  },
  projectImages: {
    create: input.projectImages.map((imageUrl, position) => ({
      position,
      projectImage: {
        connectOrCreate: {
          where: { imageUrl },
          create: { imageUrl }
        }
      }
    }))
  }
})

/**
 * Upserts each link by url and returns their ids. Unlike connectOrCreate, an upsert also
 * applies a changed label or isInternal to a link that already exists, which is what an
 * edit needs.
 */
const upsertLinks = async (prisma: Prisma.TransactionClient, input: CreatePortfolioItemInput) => {
  const links = [
    ...input.githubLinks.map(link => ({
      ...link,
      typeName: LinkTypes.Github
    })),
    ...input.productLinks.map(link => ({
      ...link,
      typeName: LinkTypes.Product
    }))
  ]
  const ids: { id: number }[] = []

  for (const { isInternal, label, url, typeName } of links) {
    const type = {
      connectOrCreate: {
        where: { name: typeName },
        create: { name: typeName }
      }
    }
    const link = await prisma.link.upsert({
      where: { url },
      update: {
        isInternal,
        label,
        type
      },
      create: {
        isInternal,
        label,
        url,
        type
      },
      select: { id: true }
    })

    ids.push(link)
  }

  return ids
}

/** The planner keeps a single plan, under this key. */
const ROOM_PLAN_KEY = 'default'

const toRoomPlan = ({ data, updatedAt }: { data: string; updatedAt: Date }) => ({
  data,
  updatedAt: updatedAt.toISOString()
})

const resolvers: Resolvers = {
  Query: {
    links: (_parent, _args, context) => context.prisma.link.findMany({ include: { type: true } }),
    linkTypes: (_parent, _args, context) => context.prisma.linkType.findMany(),
    categories: (_parent, _args, context) => context.prisma.category.findMany(),
    projectImages: (_parent, _args, context) => context.prisma.projectImage.findMany(),
    products: (_parent, _args, context) => context.prisma.product.findMany(),
    portfolioItems: (_parent, _args, context) => context.prisma.portfolioItem.findMany({
      include: portfolioItemInclude,
      orderBy: portfolioItemOrderBy
    }),
    marketSeries: (_parent, args, context) => getMarketSeries(context.prisma, args),
    yieldCurve: (_parent, args, context) => getYieldCurve(context.prisma, args.date),
    roomPlan: async (_parent, _args, context) => {
      requireAdmin(context)

      const roomPlan = await context.prisma.roomPlan.findUnique({ where: { key: ROOM_PLAN_KEY } })

      return roomPlan && toRoomPlan(roomPlan)
    }
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

      // New items go last on the site.
      const { _max: { sortOrder: lastSortOrder } } = await context.prisma.portfolioItem.aggregate({ _max: { sortOrder: true } })

      return context.prisma.portfolioItem.create({
        data: {
          ...portfolioItemRelations(input),
          sortOrder: (lastSortOrder ?? -1) + 1,
          description: input.description,
          name: input.name,
          projectId: input.projectId,
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
    },
    updatePortfolioItem: async (_parent, args, context) => {
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

      const current = await context.prisma.portfolioItem.findUnique({ where: { id: args.id } })

      if (!current) {
        return {
          code: 404,
          success: false,
          message: `No portfolio item with id ${args.id}`
        }
      }

      const existing = await context.prisma.portfolioItem.findFirst({
        where: {
          id: { not: args.id },
          OR: [{ projectId: input.projectId }, { name: input.name }]
        }
      })

      if (existing) {
        const conflict = existing.projectId === input.projectId
          ? `projectId "${input.projectId}"`
          : `name "${input.name}"`

        return {
          code: 409,
          success: false,
          message: `Another portfolio item with ${conflict} already exists`
        }
      }

      // Clearing the to-many relations and reconnecting them in one transaction makes the
      // input the item's complete new state, so anything left out of it is removed.
      return context.prisma.$transaction(async tx => {
        const links = await upsertLinks(tx, input)

        await tx.portfolioItemImage.deleteMany({ where: { portfolioItemId: args.id } })

        await tx.portfolioItem.update({
          where: { id: args.id },
          data: {
            categories: { set: [] },
            links: { set: [] },
            products: { set: [] }
          }
        })

        return tx.portfolioItem.update({
          where: { id: args.id },
          data: {
            ...portfolioItemRelations(input),
            description: input.description,
            name: input.name,
            projectId: input.projectId,
            links: { connect: links }
          },
          include: portfolioItemInclude
        })
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
    },
    reorderPortfolioItems: async (_parent, args, context) => {
      requireAdmin(context)

      const items = await context.prisma.portfolioItem.findMany({ select: { id: true } })
      const known = new Set(items.map(({ id }) => id))
      const given = new Set(args.ids)

      // A partial or stale list would leave the omitted items' positions undefined, so
      // the whole order is required: every current item, once.
      if (given.size !== args.ids.length || given.size !== known.size || args.ids.some(id => !known.has(id))) {
        return {
          code: 400,
          success: false,
          message: 'ids must list every portfolio item exactly once'
        }
      }

      return context.prisma.$transaction(args.ids.map((id, sortOrder) => context.prisma.portfolioItem.update({
        where: { id },
        data: { sortOrder },
        select: { id: true }
      })))
        .then(() => context.prisma.portfolioItem.findMany({
          include: portfolioItemInclude,
          orderBy: portfolioItemOrderBy
        }))
        .then(portfolioItems => ({
          code: 200,
          success: true,
          message: 'Success',
          portfolioItems
        }))
        .catch(error => ({
          code: 500,
          success: false,
          message: error.message ?? 'Error'
        }))
    },
    saveRoomPlan: async (_parent, args, context) => {
      requireAdmin(context)

      const validationError = validateRoomPlanData(args.data)

      if (validationError) {
        return {
          code: 400,
          success: false,
          message: validationError
        }
      }

      return context.prisma.roomPlan.upsert({
        where: { key: ROOM_PLAN_KEY },
        update: { data: args.data },
        create: {
          key: ROOM_PLAN_KEY,
          data: args.data
        }
      })
        .then(res => ({
          code: 200,
          success: true,
          message: 'Success',
          roomPlan: toRoomPlan(res)
        }))
        .catch(error => ({
          code: 500,
          success: false,
          message: error.message ?? 'Error'
        }))
    }
  },
  PortfolioItem: {
    projectImages: parent => parent.projectImages.map(({ projectImage }) => projectImage),
    githubLinks: parent => parent?.links?.filter(link => link?.type?.name === LinkTypes.Github) ?? [],
    productLinks: parent => parent?.links?.filter(link => link?.type?.name === LinkTypes.Product) ?? []
  },
  MarketSeries: {
    latest: parent => parent.recent[parent.recent.length - 1] ?? null,
    previous: parent => parent.recent[parent.recent.length - 2] ?? null
  }
}

export default resolvers
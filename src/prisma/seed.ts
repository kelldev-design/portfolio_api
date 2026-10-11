import { PrismaClient } from '@prisma/client'
import portfolioItemArray from './portfolioData'

const prisma = new PrismaClient()

async function main() {
  for (let i = 0; i < portfolioItemArray.length; i++) {
    const {
      categories,
      description,
      githubLinks,
      homeImage,
      images,
      name,
      primaryImage,
      productLinks,
      products,
      projectId
    } = portfolioItemArray[i]

    await prisma.portfolioItem.upsert({
      where: { projectId },
      update: {},
      create: {
        categories: {
          connectOrCreate: categories.map(category => ({
            where: { name: category },
            create: { name: category }
          }))
        },
        name,
        homeImage: {
          connectOrCreate: {
            where: { imageUrl: homeImage },
            create: { imageUrl: homeImage }
          }
        },
        primaryImage: {
          connectOrCreate: {
            where: { imageUrl: primaryImage },
            create: { imageUrl: primaryImage }
          }
        },
        projectId,
        description,
        sortOrder: i,
        products: {
          connectOrCreate: products.map(product => ({
            where: { name: product },
            create: { name: product }
          }))
        },
        projectImages: {
          create: images.map((imageUrl, position) => ({
            position,
            projectImage: {
              connectOrCreate: {
                where: { imageUrl },
                create: { imageUrl }
              }
            }
          }))
        },
        links: {
          connectOrCreate: [
            ...githubLinks.map(({ label, url }) => ({
              where: { url },
              create: {
                type: {
                  connectOrCreate: {
                    where: { name: 'github' },
                    create: { name: 'github' }
                  }
                },
                isInternal: false,
                label,
                url
              }
            })),
            ...productLinks.map(({ isInternal, label, url }) => ({
              where: { url },
              create: {
                type: {
                  connectOrCreate: {
                    where: { name: 'product' },
                    create: { name: 'product' }
                  }
                },
                isInternal,
                label,
                url
              }
            }))
          ]
        }
      }
    })
  }
}

main()
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
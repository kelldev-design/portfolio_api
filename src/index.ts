import 'dotenv/config'
import { ApolloServer } from 'apollo-server'
import executableSchema from './graphql/executableSchema'
import { context } from './graphql/context'
import { warnOnMissingAdminCredentials } from './graphql/auth'

const corsOrigins = [ 'https://studio.apollographql.com' ]
const kelldevDesignUrl: string | undefined = process.env.KELLDEV_CLIENT_URL
const kelleghanDesignUrl: string | undefined = process.env.KELLEGHAN_DESIGN_CLIENT_URL

if (kelldevDesignUrl) corsOrigins.push(kelldevDesignUrl)
if (kelleghanDesignUrl) corsOrigins.push(kelleghanDesignUrl)

export const server = new ApolloServer({
  schema: executableSchema,
  context,
  cors: { origin: corsOrigins }
})

const port = 4000

warnOnMissingAdminCredentials()

server.listen({ port }).then(({ url }: {url: string}) => {
  console.log(`🚀 Server ready at ${url}`)
})
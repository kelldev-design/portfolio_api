import { PrismaClient } from '@prisma/client'
import { getTokenFromHeader, verifyAdminToken } from './auth'

export const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient;
  isAdmin: boolean;
}

interface ContextArgs {
  req?: { headers?: Record<string, string | string[] | undefined> };
}

/**
 * Apollo Server v2/v3 context function. Never throws — an absent, malformed, expired or
 * otherwise invalid token simply yields `isAdmin: false`, leaving public queries working.
 */
export const context = ({ req }: ContextArgs = {}): Context => {
  const header = req?.headers?.authorization
  const token = getTokenFromHeader(Array.isArray(header) ? header[0] : header)

  return {
    prisma,
    isAdmin: token ? verifyAdminToken(token) : false
  }
}

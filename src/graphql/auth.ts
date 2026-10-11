import { createHash, timingSafeEqual } from 'crypto'
import { AuthenticationError } from 'apollo-server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Context } from './context'

export const TOKEN_EXPIRY = '12h'

// A bcrypt hash of a value no one knows, used so a login attempt with an unknown
// username still pays the cost of a bcrypt compare and cannot be told apart by timing.
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export interface AdminCredentials {
  username: string;
  passwordHash: string;
  jwtSecret: string;
}

/**
 * Reads the admin credentials from the environment. Returns null when any of them is
 * missing or empty, which makes every login attempt fail rather than fall through to a
 * default credential.
 */
export const getAdminCredentials = (): AdminCredentials | null => {
  const username = process.env.ADMIN_USERNAME
  const passwordHash = process.env.ADMIN_PASSWORD_HASH
  const jwtSecret = process.env.JWT_SECRET

  if (!username || !passwordHash || !jwtSecret) return null

  return {
    username,
    passwordHash,
    jwtSecret
  }
}

/** Logs a warning naming the admin env vars that are missing. Call once at startup. */
export const warnOnMissingAdminCredentials = (): void => {
  const missing = [ 'ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', 'JWT_SECRET' ]
    .filter(name => !process.env[name])

  if (missing.length) {
    console.warn(`⚠️  Admin login is disabled: missing ${missing.join(', ')}. Every login attempt will fail.`)
  }
}

/**
 * Constant-time string comparison. Both sides are hashed first so inputs of differing
 * length can be compared without leaking the expected length.
 */
export const safeEqual = (a: string, b: string): boolean => timingSafeEqual(
  createHash('sha256').update(a).digest(),
  createHash('sha256').update(b).digest()
)

export const verifyAdminToken = (token: string): boolean => {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) return false

  try {
    const payload = jwt.verify(token, jwtSecret)
    return typeof payload === 'object' && payload !== null && payload.role === 'admin'
  } catch {
    return false
  }
}

/** Extracts a token from an `Authorization: Bearer <token>` header value. */
export const getTokenFromHeader = (header?: string): string | null => {
  if (!header) return null

  const [ scheme, token ] = header.split(' ')
  if (!token || scheme.toLowerCase() !== 'bearer') return null

  return token.trim() || null
}

export const signAdminToken = (username: string, jwtSecret: string): string => jwt.sign(
  {
    sub: username,
    role: 'admin'
  },
  jwtSecret,
  { expiresIn: TOKEN_EXPIRY }
)

export const checkAdminPassword = async (username: string, password: string): Promise<boolean> => {
  const credentials = getAdminCredentials()
  // Always run the bcrypt compare, even without credentials or with an unknown username,
  // so the endpoint does not reveal which usernames exist through its response time.
  const usernameMatches = !!credentials && safeEqual(username, credentials.username)
  const passwordMatches = await bcrypt.compare(password, credentials?.passwordHash ?? DUMMY_HASH)

  return usernameMatches && passwordMatches
}

/** Throws unless the request carried a valid admin token. */
export const requireAdmin = (context: Context): void => {
  if (!context.isAdmin) throw new AuthenticationError('Not authenticated')
}

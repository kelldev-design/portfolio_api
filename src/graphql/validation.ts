import { CreatePortfolioItemInput, PortfolioLinkInput } from '../types/generatedTypes'

/** `projectId` is used as a URL path segment at `/project/:projectId`. */
const PROJECT_ID_PATTERN = /^[a-zA-Z0-9-]+$/

const isAbsoluteUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const trimLinks = (links: PortfolioLinkInput[]): PortfolioLinkInput[] => links.map(link => ({
  label: link.label.trim(),
  url: link.url.trim(),
  isInternal: link.isInternal
}))

/** Returns the input with every string trimmed. */
export const trimPortfolioItemInput = (input: CreatePortfolioItemInput): CreatePortfolioItemInput => ({
  name: input.name.trim(),
  projectId: input.projectId.trim(),
  description: input.description.trim(),
  categories: input.categories.map(category => category.trim()),
  products: input.products.map(product => product.trim()),
  homeImage: input.homeImage.trim(),
  primaryImage: input.primaryImage.trim(),
  projectImages: input.projectImages.map(imageUrl => imageUrl.trim()),
  githubLinks: trimLinks(input.githubLinks),
  productLinks: trimLinks(input.productLinks)
})

/** Returns a message describing the first problem with the input, or null when it is valid. */
export const validatePortfolioItemInput = (input: CreatePortfolioItemInput): string | null => {
  const required: [string, string][] = [
    [ 'name', input.name ],
    [ 'projectId', input.projectId ],
    [ 'description', input.description ],
    [ 'homeImage', input.homeImage ],
    [ 'primaryImage', input.primaryImage ]
  ]

  for (const [ field, value ] of required) {
    if (!value) return `${field} is required`
  }

  if (!PROJECT_ID_PATTERN.test(input.projectId)) {
    return 'projectId may only contain letters, numbers and hyphens'
  }

  const images: [string, string][] = [
    [ 'homeImage', input.homeImage ],
    [ 'primaryImage', input.primaryImage ],
    ...input.projectImages.map((imageUrl): [string, string] => ([ 'projectImages', imageUrl ]))
  ]

  for (const [ field, imageUrl ] of images) {
    if (!isAbsoluteUrl(imageUrl)) return `${field} must be a valid absolute URL, received "${imageUrl}"`
  }

  // Each image holds one position in an item's gallery, so it can appear there only once.
  if (new Set(input.projectImages).size !== input.projectImages.length) {
    return 'projectImages must not contain the same url twice'
  }

  const links: [string, PortfolioLinkInput][] = [
    ...input.githubLinks.map((link): [string, PortfolioLinkInput] => ([ 'githubLinks', link ])),
    ...input.productLinks.map((link): [string, PortfolioLinkInput] => ([ 'productLinks', link ]))
  ]

  for (const [ field, link ] of links) {
    if (!link.label) return `${field} entries must have a label`
    if (!link.url) return `${field} entries must have a url`

    const isValid = link.isInternal
      ? link.url.startsWith('/') || isAbsoluteUrl(link.url)
      : isAbsoluteUrl(link.url)

    if (!isValid) {
      return link.isInternal
        ? `${field} url must be a valid absolute URL or a root-relative path, received "${link.url}"`
        : `${field} url must be a valid absolute URL, received "${link.url}"`
    }
  }

  const categories: [string, string][] = [
    ...input.categories.map((category): [string, string] => ([ 'categories', category ])),
    ...input.products.map((product): [string, string] => ([ 'products', product ]))
  ]

  for (const [ field, value ] of categories) {
    if (!value) return `${field} entries must not be empty`
  }

  return null
}

/** Larger than any real plan by far, so only a mistake or abuse reaches it. */
const ROOM_PLAN_MAX_LENGTH = 1_000_000

/** Returns a message describing why `data` is not a room plan, or null when it is one. */
export const validateRoomPlanData = (data: string): string | null => {
  if (data.length > ROOM_PLAN_MAX_LENGTH) return `data must be at most ${ROOM_PLAN_MAX_LENGTH} characters`

  let plan: unknown

  try {
    plan = JSON.parse(data)
  } catch {
    return 'data must be valid JSON'
  }

  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) return 'data must be a JSON object'

  const { furniture, rooms } = plan as Record<string, unknown>

  if (!Array.isArray(furniture) || !Array.isArray(rooms)) return 'data must have furniture and rooms arrays'

  return null
}

/** Small path and object guards kept local so app routes can stay compatible with the pinned staging SDK. */
const SEGMENT = /^[a-z0-9][a-z0-9._~-]*$/i

export type IntegrationTarget = { name: string; endpoint: string; path: string }

function validSegment(value: string): boolean {
  return SEGMENT.test(value) && value !== '.' && value !== '..'
}

export function integrationPath(name: string, endpoint: string): string | null {
  if (!validSegment(name) || !validSegment(endpoint)) return null
  return `/api/integrations/${name}/${endpoint}`
}

export function splitIntegrationEndpoint(value: string): IntegrationTarget | null {
  const parts = value.split('/')
  if (parts.length !== 2) return null
  const [name, endpoint] = parts
  const path = integrationPath(name, endpoint)
  return path ? { name, endpoint, path } : null
}

/** Return only own properties; inherited names such as `constructor` never resolve. */
export function lookupOwn<T extends object>(source: T, key: string): T[keyof T] | undefined {
  if (!Object.prototype.hasOwnProperty.call(source, key)) return undefined
  return (source as Record<string, T[keyof T]>)[key]
}

import { getAuthToken } from 'deepspace'

export type ActionOutcome<T = Record<string, unknown>> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

/** POST a server action (src/actions) as the signed-in volunteer. */
export async function callAction<T = Record<string, unknown>>(
  name: string,
  params: Record<string, unknown> = {},
): Promise<ActionOutcome<T>> {
  const token = await getAuthToken()
  const response = await fetch('/api/actions/' + name, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(params),
  })
  try {
    return (await response.json()) as ActionOutcome<T>
  } catch {
    return { success: false, error: 'The server returned an unexpected response' }
  }
}

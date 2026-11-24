import { test, expect } from '@playwright/test'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('signed-out /home mounts providers but opens no records WebSocket', async ({ page }) => {
    // /home is dynamic, so the providers mount; records connect only once the
    // visitor is signed in, so signed out we see the panel and no /ws/ socket.
    const sockets: string[] = []
    page.on('websocket', (ws) => {
      if (new URL(ws.url()).pathname.startsWith('/ws/')) sockets.push(ws.url())
    })
    await page.goto('/home')
    await expect(page.getByTestId('signed-out-panel')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(1500)
    expect(sockets).toEqual([])
  })
})

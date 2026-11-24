/**
 * Two-user shiftboard spec: Ana and Ben work the same repair queue on /home
 * and every cross-user assertion waits for the realtime sync.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
import type { Page } from '@playwright/test'

test.skip(loadAllTestAccounts().length < 2, 'Needs the Ana and Ben test accounts.')

const SYNC = { timeout: 15_000 }

const row = (page: Page, itemName: string) =>
  page.locator('.case-row').filter({ hasText: itemName })

async function selectCase(page: Page, itemName: string) {
  await page.getByRole('button', { name: 'All cases' }).click()
  await row(page, itemName).first().click()
  await expect(page.locator('.detail-heading h2')).toHaveText(itemName, SYNC)
}

test('Ana and Ben run a shift together', async ({ users }) => {
  test.setTimeout(240_000)
  const [ana, ben] = await users(['Ana', 'Ben'])
  const run = Date.now().toString(36)
  const item = `Test kettle ${run}`
  const handoffDraft = `Ana unsaved draft ${run}`
  const benHandoff = `Ben saved handoff ${run}`
  const chatMessage = `Shift note ${run}`

  await test.step('1. both load the shiftboard; example cases appear once', async () => {
    await Promise.all([ana.page.goto('/home'), ben.page.goto('/home')])
    for (const { page } of [ana, ben]) {
      await expect(page.getByRole('heading', { name: 'Keep good things in use.' })).toBeVisible(SYNC)
      await page.getByRole('button', { name: 'All cases' }).click()
      await expect(page.locator('.case-row i', { hasText: 'EXAMPLE' })).toHaveCount(4, SYNC)
      await expect(page.locator('.case-row').filter({ hasText: 'RC-024' })).toHaveCount(1)
      await expect(page.locator('.case-row').filter({ hasText: 'Trek city bike' })).toHaveCount(1)
    }
  })

  await test.step('2. Ana adds a repair and Ben sees it live', async () => {
    await ana.page.getByRole('button', { name: 'New repair' }).click()
    await ana.page.getByPlaceholder('e.g. Handheld vacuum').fill(item)
    await ana.page.getByPlaceholder('Describe the symptom and what the owner has tried.').fill('Does not heat water')
    await ana.page.getByRole('button', { name: 'Add to repair queue' }).click()
    await expect(row(ana.page, item)).toHaveCount(1, SYNC)
    await expect(row(ben.page, item)).toHaveCount(1, SYNC)
    await selectCase(ana.page, item)
    await selectCase(ben.page, item)
  })

  await test.step('3. Ana changes status; Ben sees the pill update', async () => {
    await ana.page.getByRole('button', { name: 'Set status: Waiting on parts' }).click()
    await expect(row(ben.page, item).locator('.status-pill')).toHaveText('Waiting on parts', SYNC)
    await expect(row(ana.page, item).locator('.status-pill')).toHaveText('Waiting on parts', SYNC)
  })

  await test.step('4a. Ana takes the case; Ben sees Take over', async () => {
    await ana.page.getByRole('button', { name: 'Take this case' }).click()
    await expect(ana.page.getByText('ASSIGNED TO YOU', { exact: true })).toBeVisible(SYNC)
    await expect(ben.page.getByRole('button', { name: 'Take over' })).toBeVisible(SYNC)
    await expect(ben.page.locator('.assignee-row b')).toHaveText('Ana', SYNC)
  })

  await test.step('8. activity feed shows the status and claim events', async () => {
    for (const { page } of [ana, ben]) {
      const feed = page.locator('.activity-panel')
      await expect(feed.getByText('Status moved to Waiting on parts').first()).toBeVisible(SYNC)
      await expect(feed.getByText('Ana picked up this repair').first()).toBeVisible(SYNC)
    }
  })

  await test.step('4b. Ben takes over after confirming; Ana sees Ben; Ben releases', async () => {
    ben.page.once('dialog', dialog => void dialog.accept())
    await ben.page.getByRole('button', { name: 'Take over' }).click()
    await expect(ben.page.getByText('ASSIGNED TO YOU', { exact: true })).toBeVisible(SYNC)
    await expect(ana.page.locator('.assignee-row b')).toHaveText('Ben', SYNC)
    await expect(ana.page.getByRole('button', { name: 'Take over' })).toBeVisible(SYNC)

    await ben.page.getByRole('button', { name: 'Release' }).click()
    await expect(ben.page.locator('.assignee-row b')).toHaveText('Available', SYNC)
    await expect(ben.page.getByRole('button', { name: 'Take this case' })).toBeVisible(SYNC)
    await expect(ana.page.locator('.assignee-row b')).toHaveText('Available', SYNC)
  })

  await test.step('5. concurrent handoff edit keeps the unsaved draft', async () => {
    const anaNext = ana.page.getByPlaceholder('Leave a clear action or pickup note')
    await anaNext.fill(handoffDraft)

    const benNext = ben.page.getByPlaceholder('Leave a clear action or pickup note')
    await benNext.fill(benHandoff)
    await ben.page.getByRole('button', { name: 'Save handoff' }).click()

    await expect(ana.page.getByText('Another volunteer updated this handoff')).toBeVisible(SYNC)
    await expect(anaNext).toHaveValue(handoffDraft)
  })

  await test.step('6. team chat shows the sender name', async () => {
    const open = ana.page.getByRole('button', { name: /Open team handoff/ })
    if (await open.isVisible()) await open.click()
    await ana.page.getByLabel('Shift handoff note').fill(chatMessage)
    await ana.page.getByRole('button', { name: 'Send handoff note' }).click()

    const benRow = ben.page.locator('.message-row').filter({ hasText: chatMessage })
    await expect(benRow).toBeVisible(SYNC)
    await expect(benRow.locator('b')).toHaveText('Ana')
    await expect(benRow.locator('b')).not.toHaveText('Volunteer')
  })

  await test.step('7. presence shows two volunteers on shift', async () => {
    for (const { page } of [ana, ben]) {
      const card = page.locator('.summary-card').filter({ hasText: 'VOLUNTEERS ON SHIFT' })
      await expect(card.locator('strong')).toHaveText('2', SYNC)
    }
  })
})

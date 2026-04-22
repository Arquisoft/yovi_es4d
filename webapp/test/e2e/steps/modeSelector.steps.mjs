import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

const BASE_URL = process.env.BASE_URL || 'https://localhost:5173'
const API_URL = BASE_URL

const esc = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const accentPattern = (value) => esc(value.normalize('NFD').replace(/\p{Diacritic}/gu, ''))
  .replace(/a/gi, '[a�]')
  .replace(/e/gi, '[e�]')
  .replace(/i/gi, '[i�]')
  .replace(/o/gi, '[o�]')
  .replace(/u/gi, '[u�]')
  .replace(/n/gi, '[n�]')

const textRegex = (value) => new RegExp(accentPattern(value), 'i')

const modeLabel = (modeId) => {
  if (modeId === 'vsBot') return 'Contra la m�quina'
  if (modeId === 'multiplayer') return '2 Jugadores'
  return modeId
}

const difficultyLabels = {
  random_bot: 'Aleatorio',
  intermediate_bot: 'Intermedio',
  hard_bot: 'Dif�cil',
}

Given('the mode selector page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.route(`${API_URL}/api/game/bot-modes`, async (route) => {
    if (this.mockBotModesResponse) {
      await route.fulfill({
        status: this.mockBotModesStatus || 200,
        contentType: 'application/json',
        body: JSON.stringify({ botModes: this.mockBotModesData }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ botModes: ['random_bot', 'intermediate_bot', 'hard_bot'] }),
      })
    }
  })

  await page.goto(`${BASE_URL}/select`)
  await page.waitForSelector('.ms-header', { timeout: 5000 })
})

Given('the mode selector page is loading bot modes', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.route(`${API_URL}/api/game/bot-modes`, () => {})

  await page.goto(`${BASE_URL}/select`)
  await page.waitForSelector('.ms-header', { timeout: 5000 })
})

Given('the bot modes API returns all three modes', async function () {
  this.mockBotModesData = ['random_bot', 'intermediate_bot', 'hard_bot']
  this.mockBotModesResponse = true
  this.mockBotModesStatus = 200
})

Given('the bot modes API fails', async function () {
  this.mockBotModesData = []
  this.mockBotModesResponse = true
  this.mockBotModesStatus = 500
})

When('I select {string} board size', async function (sizeLabel) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  const card = page.locator('.ms-size-card').filter({ hasText: textRegex(sizeLabel) }).first()
  await card.waitFor({ timeout: 8000 })
  await card.click()
  await page.waitForTimeout(300)
})

When('I enter {string} as player 2 name', async function (name) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  const input = page.locator('input[placeholder*="Nombre del rival"]')
  await input.fill(name)
  await page.waitForTimeout(300)
})

When('I click the mode selector play button', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.locator('.ms-play-btn').click()
})

When('I click the online game card', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.locator('.ms-mode-card').filter({ hasText: /Jugar online/i }).first().click()
})

When('the mode selector page reloads', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.route(`${API_URL}/api/game/bot-modes`, async (route) => {
    await route.fulfill({
      status: this.mockBotModesStatus || 200,
      contentType: 'application/json',
      body: JSON.stringify({ botModes: this.mockBotModesData ?? [] }),
    })
  })

  await page.reload()
  await page.waitForSelector('.ms-header', { timeout: 5000 })
  await page.waitForTimeout(500)
})

Then('I should see the mode selector header', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  assert.ok(await page.locator('.ms-header').isVisible(), 'Mode selector header (.ms-header) not found')
})

Then('the play button should be visible', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  assert.ok(await page.locator('.ms-play-btn').isVisible(), 'Play button (.ms-play-btn) not found')
})

Then('the play button should be disabled', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const btn = page.locator('.ms-play-btn')
  await btn.waitFor({ timeout: 5000 })
  assert.ok(await btn.isDisabled(), 'Play button should be disabled while loading')
})

Then('the difficulty section should be visible', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  assert.ok(await page.locator('.ms-bot-difficulty-list').isVisible(), 'Difficulty section should be visible')
})

Then('the difficulty section should not be visible', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const section = page.locator('.ms-bot-difficulty-list')
  const count = await section.count()
  if (count === 0) return
  assert.ok(!(await section.isVisible()), 'Difficulty section should NOT be visible in multiplayer mode')
})

Then('the player 2 name input should be visible', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  assert.ok(await page.locator('input[placeholder*="Nombre del rival"]').isVisible(), 'Player 2 name input should be visible')
})

Then('the player 2 name input should not be visible', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const input = page.locator('input[placeholder*="Nombre del rival"]')
  const count = await input.count()
  if (count === 0) return
  assert.ok(!(await input.isVisible()), 'Player 2 name input should NOT be visible in vsBot mode')
})

Then('the player 2 name input should contain {string}', async function (expectedName) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const value = await page.locator('input[placeholder*="Nombre del rival"]').inputValue()
  const normalizedExpected = expectedName.slice(0, 20)
  assert.strictEqual(value, normalizedExpected, `Expected "${normalizedExpected}", got "${value}"`)
})

Then('a checkmark should not appear', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const checkmark = page.locator('span').filter({ hasText: '?' }).first()
  const count = await checkmark.count()
  if (count === 0) return
  assert.ok(!(await checkmark.isVisible()), 'Checkmark should NOT be visible when player 2 name is empty')
})

Then('the player 2 name input border should be highlighted', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const borderColor = await page.locator('input[placeholder*="Nombre del rival"]').evaluate((el) => getComputedStyle(el).borderColor)
  assert.ok(borderColor && borderColor !== '', `Input border color should change when text is entered, got "${borderColor}"`)
})

Then('the unsaved game warning should not be visible', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const warning = page.locator('text=Esta partida no quedar� guardada en el historial')
  const count = await warning.count()
  if (count === 0) return
  assert.ok(!(await warning.isVisible()), 'Unsaved game warning should NOT be visible in vsBot mode')
})

Then('the {string} difficulty should be selected', async function (botModeId) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const label = difficultyLabels[botModeId] || botModeId
  const button = page.locator('.ms-bot-difficulty-list .ms-mode-card').filter({ hasText: textRegex(label) }).first()
  assert.ok(await button.evaluate((el) => el.classList.contains('selected')), `"${label}" difficulty should have class "selected"`)
})

Then('the {string} difficulty should not be selected', async function (botModeId) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const label = difficultyLabels[botModeId] || botModeId
  const button = page.locator('.ms-bot-difficulty-list .ms-mode-card').filter({ hasText: textRegex(label) }).first()
  assert.ok(!(await button.evaluate((el) => el.classList.contains('selected'))), `"${label}" difficulty should NOT have class "selected"`)
})

Then('I should navigate to {string}', async function (expectedPath) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForURL(`${BASE_URL}${expectedPath}`, { timeout: 5000 })
  assert.ok(page.url().includes(expectedPath), `Expected URL to include "${expectedPath}", got "${page.url()}"`)
})

Then('I should see {int} difficulty options', async function (count) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForSelector('.ms-bot-difficulty-list', { timeout: 5000 })
  await page.waitForTimeout(300)
  const actualCount = await page.locator('.ms-bot-difficulty-list .ms-mode-card').count()
  assert.strictEqual(actualCount, count, `Expected ${count} difficulty options, got ${actualCount}`)
})

Then('I should see at least {string} difficulty', async function (difficultyLabel) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForTimeout(1000)
  const button = page.locator('.ms-bot-difficulty-list .ms-mode-card').filter({ hasText: textRegex(difficultyLabel) }).first()
  assert.ok(await button.isVisible(), `At least "${difficultyLabel}" difficulty should be present as fallback`)
})

Then('the game should have board size {string}', async function (sizeValue) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForSelector('.game-board', { timeout: 5000 })
  const boardSize = await page.evaluate(() => {
    const board = document.querySelector('.game-board')
    return board?.getAttribute('data-size') || board?.children.length || window.__gameState?.boardSize
  })
  assert.strictEqual(String(boardSize), sizeValue, `Expected board size ${sizeValue}, got ${boardSize}`)
})

Then('the game should have bot mode {string}', async function (expectedBotMode) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForSelector('.game-board', { timeout: 5000 })
  const botMode = await page.evaluate(() => window.__gameState?.botMode)
  assert.strictEqual(botMode, expectedBotMode, `Expected bot mode ${expectedBotMode}, got ${botMode}`)
})

Then('player 2 should be named {string}', async function (expectedName) {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForSelector('.player-2-name, .opponent-name', { timeout: 5000 })
  const player2Name = await page.textContent('.player-2-name, .opponent-name')
  assert.ok(player2Name?.includes(expectedName), `Expected player 2 name to include "${expectedName}", got "${player2Name}"`)
})

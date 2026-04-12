import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'


// ─────────────────────────────────────
// MOCK GAME STATE
// ─────────────────────────────────────

const fakeGameState = {
  players: [
    { name: "Alice", points: 10 },
    { name: "Bob", points: 5 }
  ],
  winner: "j1",
  hexData: [{ id: 1 }],
  gameMode: "multiplayer",
  onlineRole: "j1",
  userProfile: {
    username: "Alice",
    avatar: "logo.png"
  },
  opponentProfile: {
    username: "Bob",
    avatar: "logo.png"
  }
}


// ─────────────────────────────────────
// GIVEN
// ─────────────────────────────────────

Given('the Game Over page is open without game data', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  const BASE_URL = this.BASE_URL
  await page.goto(`${BASE_URL}/gameover`)
})


Given('the Game Over page is open with a finished game', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  const BASE_URL = this.BASE_URL

  // Injectar location.state manualmente
  await page.goto(`${BASE_URL}`)

  await page.evaluate((state) => {
    window.history.pushState(state, "", "/gameover")
  }, fakeGameState)

  await page.goto(`${BASE_URL}/gameover`)
})


// ─────────────────────────────────────
// THEN
// ─────────────────────────────────────

Then('I should see the no game message', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.waitForSelector('.go-empty')
  const text = await page.textContent('.go-empty')

  assert.ok(text && text.length > 0, 'No empty game message shown')
})


Then('I should see the winner name Alice', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.waitForSelector('.go-winner-name')
  const text = await page.textContent('.go-winner-name')

  assert.ok(text?.includes('Alice'), `Winner name incorrect: ${text}`)
})


Then('I should see player score 0010', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.waitForSelector('.go-score')

  const scores = await page.locator('.go-score').allTextContents()

  assert.ok(scores[0].includes('0010'), 'Player score incorrect')
})


Then('I should see opponent score 0005', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  const scores = await page.locator('.go-score').allTextContents()

  assert.ok(scores[1].includes('0005'), 'Opponent score incorrect')
})


// ─────────────────────────────────────
// WHEN
// ─────────────────────────────────────

When('I click new game button', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.click('.go-btn-primary')
})


When('I click go home button', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.click('.go-btn-secondary')
})


// ─────────────────────────────────────
// NAVIGATION ASSERTIONS
// ─────────────────────────────────────

Then('I should be redirected to select page', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.waitForURL(/select/, { timeout: 5000 })

  const url = page.url()
  assert.ok(url.includes('/select'), `Not redirected to select page: ${url}`)
})


Then('I should be redirected to home page', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')

  await page.waitForURL('/', { timeout: 5000 })

  const url = page.url()
  assert.ok(url.endsWith('/'), `Not redirected to home page: ${url}`)
})
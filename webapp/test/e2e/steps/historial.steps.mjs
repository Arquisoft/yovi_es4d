import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the historial page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const BASE_URL = this.BASE_URL;
  await page.goto(`${BASE_URL}/historial`)
})


Then('I should see the historial title', async function () {
  const page = this.page
  const text = await page.textContent('h1')
  assert.ok(text && text.length > 0)
})

Then('I should see the summary section', async function () {
  const page = this.page
  await page.waitForSelector('.historial-summary')
})

Then('I should see the filters', async function () {
  const page = this.page
  const text = await page.textContent('h2')
  assert.ok(text && text.toLowerCase().includes('filtros'))
})

Then('I should see the games list or a no games message', async function () {
  const page = this.page
  const existsList = await page.$('.historial-list ul')
  const existsNoGames = await page.$('.historial-list p')
  assert.ok(existsList || existsNoGames)
})

Then('I should see the pagination controls', async function () {
  const page = this.page
  const text = await page.textContent('span')
  assert.ok(text && (text.includes('Página') || text.includes('Page')))
})

Then('I should see the go back button', async function () {
  const page = this.page
  await page.waitForSelector('.action-row button')
})

When('I click the next page button', async function () {
  const page = this.page
  await page.click('button:has-text("⇨")')
})

When('I click the previous page button', async function () {
  const page = this.page
  await page.click('button:has-text("⇦")')
})

Then('the current page should increase', async function () {
  const page = this.page
  const text = await page.textContent('span')
  const match = text && text.match(/Página (\d+)/)
  assert.ok(match && parseInt(match[1]) > 1)
})

Then('the current page should decrease', async function () {
  const page = this.page
  const text = await page.textContent('span')
  const match = text && text.match(/Página (\d+)/)
  assert.ok(match && parseInt(match[1]) === 1)
})




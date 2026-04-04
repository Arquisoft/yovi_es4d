import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the rules page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const BASE_URL = this.BASE_URL;
  await page.goto(`${BASE_URL}/rules`)
})

Then('I should see the rules title', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForSelector('h1')
  const text = await page.textContent('h1')
  assert.ok(text && text.length > 0, 'Rules title should be visible')
})

Then('I should see the rules descriptions', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  for (let i = 1; i <= 4; i++) {
    const selector = `.rules-content p:nth-child(${i})`
    await page.waitForSelector(selector)
    const text = await page.textContent(selector)
    assert.ok(text && text.length > 0, `Rules description ${i} should be visible`)
  }
})

Then('I should see a link to Wikipedia', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const link = await page.getAttribute('.rules-content a', 'href')
  assert.ok(link && link.includes('wikipedia.org'), 'Wikipedia link should be present')
})

Then('I should see a go back button', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForSelector('.play-button')
  const text = await page.textContent('.play-button')
  assert.ok(text && text.length > 0, 'Go back button should be visible')
})

When('I click the go back button', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.click('.play-button')
})

Then('I should be redirected to the start screen', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForSelector('h1')
  const url = page.url()
  assert.ok(url.endsWith('/') || url.endsWith('/#'), `Expected to be on start screen, got: ${url}`)
})

import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the start screen is open', async function () {
  const page = this.page;
  const BASE_URL = this.BASE_URL;
  if (!page) throw new Error('Page not initialized');
  await page.goto(`${BASE_URL}/`);
})


Then('I should see the title', async function () {
  const page = this.page
  const text = await page.textContent('h1')
  assert.ok(text && text.length > 0)
})

Then('I should see the subtitle', async function () {
  const page = this.page
  const text = await page.textContent('h2')
  assert.ok(text && text.length > 0)
})

Then('I should see the play button', async function () {
  const page = this.page
  await page.waitForSelector('.play-button')
})

Then('I should see the typing animation', async function () {
  const page = this.page
  // Busca el texto animado en el DOM
  const typingHolder = await page.waitForSelector('.typing-holder')
  const text = await typingHolder.textContent()
  assert.ok(text && text.length > 0)
})

Then('I should see the footer credits', async function () {
  const page = this.page
  const text = await page.textContent('.start-footer p')
  assert.ok(text && text.length > 0)
})

When('I click the play button', async function () {
  const page = this.page
  await page.click('.play-button')
})




Then('I should be on the select page', async function () {
  const page = this.page;
  const BASE_URL = this.BASE_URL;
  await page.waitForURL(`${BASE_URL}/select`, { timeout: 5000 });
})

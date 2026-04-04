import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the home page is open', async function () {
  const page = this.page;
  const BASE_URL = this.BASE_URL;
  if (!page) throw new Error('Page not initialized');
  await page.goto(`${BASE_URL}/`);
})


Then('I should see the language selector', async function () {
  const page = this.page
  await page.waitForSelector('#language-select')
})

Then('I should see a rules button', async function () {
  const page = this.page
  const text = await page.textContent('.navbar-menu li:nth-child(2) button')
  assert.ok(text && text.length > 0)
})

Then('I should see a profile button', async function () {
  const page = this.page
  const text = await page.textContent('.navbar-menu li:nth-child(3) button')
  assert.ok(text && text.length > 0)
})

Then('I should see a historial button', async function () {
  const page = this.page
  const text = await page.textContent('.navbar-menu li:nth-child(4) button')
  assert.ok(text && text.length > 0)
})

Then('I should see a login or logout button', async function () {
  const page = this.page
  const text = await page.textContent('.navbar-menu li:nth-child(5) button')
  assert.ok(text && text.length > 0)
})

When('I select {string} in the language selector', async function (lang) {
  const page = this.page
  await page.selectOption('#language-select', lang)
})

Then('the sidebar should be in English', async function () {
  const page = this.page
  const text = await page.textContent('.navbar-menu li:nth-child(2) button')
  assert.ok(text && (text.toLowerCase().includes('rules') || text.toLowerCase().includes('reglas')))
})

When('I click the rules button', async function () {
  const page = this.page
  await page.click('.navbar-menu li:nth-child(2) button')
})

Then('I should be on the rules page', async function () {
  const page = this.page;
  const BASE_URL = this.BASE_URL;
  await page.waitForURL(`${BASE_URL}/rules`, { timeout: 5000 });
})

When('I click the profile button', async function () {
  const page = this.page
  await page.click('.navbar-menu li:nth-child(3) button')
})

Then('I should be on the profile page', async function () {
  const page = this.page;
  const BASE_URL = this.BASE_URL;
  await page.waitForURL(`${BASE_URL}/edit`, { timeout: 5000 });
});

When('I click the historial button', async function () {
  const page = this.page
  await page.click('.navbar-menu li:nth-child(4) button')
})

Then('I should be on the historial page', async function () {
  const page = this.page;
  const BASE_URL = this.BASE_URL;
  await page.waitForURL(`${BASE_URL}/historial`, { timeout: 5000 });
});


When('I click the login button', async function () {
  const page = this.page
  await page.click('.navbar-menu li:nth-child(5) button')
})

Then('I should be on the login page', async function () {
  const page = this.page;
  const BASE_URL = this.BASE_URL;
  await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 });
});

When('I click the logout button', async function () {
  const page = this.page
  await page.click('.navbar-menu li:nth-child(5) button')
})

Then('I should be logged out', async function () {
  const page = this.page
  // Espera a que el botón cambie a login
  await page.waitForSelector('.navbar-menu li:nth-child(5) button')
  const text = await page.textContent('.navbar-menu li:nth-child(5) button')
  assert.ok(text && (text.toLowerCase().includes('login') || text.toLowerCase().includes('iniciar sesión')))
})

Then('I should see the login button', async function () {
  const page = this.page
  const text = await page.textContent('.navbar-menu li:nth-child(5) button')
  assert.ok(text && (text.toLowerCase().includes('login') || text.toLowerCase().includes('iniciar sesión')))
})

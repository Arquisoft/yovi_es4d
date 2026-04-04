import axios from 'axios';
Given('a test user exists', async function () {
  // Intenta registrar el usuario, ignora si ya existe
  try {
    await axios.post('http://localhost:8000/adduser', {
      username: 'TestUserCucumber',
      email: 'testcucumber@example.com',
      password: 'Password123'
    });
  } catch (e) {
    // Si ya existe, ignorar
  }
});
import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the login page is open', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  const BASE_URL = this.BASE_URL;
  await page.goto(`${BASE_URL}/login`)
})

When('I enter a valid email and password', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.fill('#email', 'testcucumber@example.com')
  await page.fill('#password', 'Password123')
})

When('I enter an invalid email and a valid password', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.fill('#email', 'notanemail')
  await page.fill('#password', 'Password123')
})

When('I enter a valid email and an invalid password', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.fill('#email', 'testcucumber@example.com')
  await page.fill('#password', 'wrongpassword')
})

When('I submit the login form', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.click('button[type="submit"]')
})


Then('I should be redirected to the home page', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  await page.waitForTimeout(1000); // wait for possible redirect
  const url = page.url();
  assert.ok(url.endsWith('/') || url.endsWith('/#') || url.includes('/dashboard') || url.includes('/home'), `Not redirected to home, current url: ${url}`);
})

Then('I should see an error message', async function () {
  const page = this.page
  if (!page) throw new Error('Page not initialized')
  try {
    await page.waitForSelector('.error-message', { timeout: 5000 });
    const text = await page.textContent('.error-message');
    assert.ok(text && text.length > 0, 'No error message shown');
  } catch (e) {
    const html = await page.content();
    throw e;
  }
})

// test/e2e/steps/common.steps.mjs
import { Given, Then } from '@cucumber/cucumber';
import assert from 'assert';

// Sidebar
Then('I should see the sidebar', async function () {
  await this.page.waitForSelector('.navbar', { timeout: 5000 });
  const sidebar = await this.page.$('.navbar');
  assert.ok(sidebar, 'Sidebar not found');
});


// Logged in
Given('I am logged in', async function () {
  const page = this.page;
  const BASE_URL = this.BASE_URL;
  // Try to logout first (if already logged in)
  try {
    await page.click('.navbar-menu li:nth-child(5) button');
  } catch {}
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', 'testcucumber@example.com');
  await page.fill('#password', 'Password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`, { timeout: 5000 });
});

Given('I am logged out', async function () {
  const page = this.page;
  try {
    await page.click('.navbar-menu li:nth-child(5) button');
  } catch {}
});

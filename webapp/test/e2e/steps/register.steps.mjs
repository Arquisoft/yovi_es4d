import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

Given('the register page is open', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	const BASE_URL = this.BASE_URL;
	await page.goto(`${BASE_URL}/register`)
})

When('I enter a valid username, valid email and valid matching passwords', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	await page.fill('#username', 'TestUserCucumber')
	await page.fill('#email', 'testcucumber@example.com')
	await page.fill('#password', 'Password123')
	await page.fill('#repassword', 'Password123')
	await page.click('button[type="submit"]')
})

Then('I should be redirected to the login page', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 })
	const url = page.url()
	assert.ok(url.includes('/login'), `Not redirected to login, current url: ${url}`)
})

When('I enter a username with less than 3 characters', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	await page.fill('#username', 'ab')
})

When('I fill the rest of the fields correctly', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	await page.fill('#email', 'testcucumber@example.com')
	await page.fill('#password', 'Password123')
	await page.fill('#repassword', 'Password123')
})

When('I submit the register form', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	await page.click('button[type="submit"]')
})

Then('I should see a username error message', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	try {
		await page.waitForSelector('.error-message', { timeout: 5000 });
		const text = await page.textContent('.error-message');
		assert.ok(text && text.length > 0, 'No username error message shown');
	} catch (e) {
		const html = await page.content();
		throw e;
	}
})

When('I enter an invalid email', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	await page.fill('#username', 'TestUserCucumber')
	await page.fill('#email', 'notanemail')
})

Then('I should see an email error message', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	try {
		await page.waitForSelector('.error-message', { timeout: 5000 });
		const text = await page.textContent('.error-message');
		assert.ok(text && text.length > 0, 'No email error message shown');
	} catch (e) {
		const html = await page.content();
		throw e;
	}
})

When('I enter a password without uppercase, numbers or less than 8 characters', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	await page.fill('#username', 'TestUserCucumber')
	await page.fill('#email', 'testcucumber@example.com')
	await page.fill('#password', 'abc')
	await page.fill('#repassword', 'abc')
})

Then('I should see a password error message', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	try {
		await page.waitForSelector('.error-message', { timeout: 5000 });
		const text = await page.textContent('.error-message');
		assert.ok(text && text.length > 0, 'No password error message shown');
	} catch (e) {
		const html = await page.content();
		throw e;
	}
})

When('I enter passwords that do not match', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	await page.fill('#username', 'TestUserCucumber')
	await page.fill('#email', 'testcucumber@example.com')
	await page.fill('#password', 'Password123')
	await page.fill('#repassword', 'Password321')
})

Then('I should see a password match error message', async function () {
	const page = this.page
	if (!page) throw new Error('Page not initialized')
	try {
		await page.waitForSelector('.error-message', { timeout: 5000 });
		const text = await page.textContent('.error-message');
		assert.ok(text && text.length > 0, 'No password match error message shown');
	} catch (e) {
		const html = await page.content();
		throw e;
	}
})


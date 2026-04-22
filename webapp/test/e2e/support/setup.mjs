import { setWorldConstructor, Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium } from 'playwright'

setDefaultTimeout(60_000)


class CustomWorld {
  browser = null;
  page = null;
  BASE_URL = process.env.BASE_URL || 'https://localhost:5173';
}

setWorldConstructor(CustomWorld)

Before(async function () {
  // Allow turning off headless mode and enabling slow motion/devtools via env vars
  const headless = true
  const slowMo = 0
  const devtools = false

  this.browser = await chromium.launch({ headless, slowMo, devtools })
  const context = await this.browser.newContext({ ignoreHTTPSErrors: true }) // ← new
  this.page = await context.newPage()                                         // ← changed
})

After(async function () {
  if (this.page) await this.page.close()
  if (this.browser) await this.browser.close()
})

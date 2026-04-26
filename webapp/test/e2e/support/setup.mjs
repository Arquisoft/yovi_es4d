import { setWorldConstructor, Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium } from 'playwright'

setDefaultTimeout(60_000)

class CustomWorld {
  browser = null
  context = null
  page = null
  BASE_URL = (() => {
    const raw = process.env.BASE_URL?.trim()
    const fallback = 'http://localhost:5173'
    const value = raw || fallback

    // Vite dev server runs over HTTP in this repo. If someone has BASE_URL pinned to
    // https://localhost:5173, Playwright will fail with ERR_SSL_PROTOCOL_ERROR.
    try {
      const parsed = new URL(value)
      if (
        parsed.protocol === 'https:' &&
        parsed.port === '5173' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
      ) {
        parsed.protocol = 'http:'
        return parsed.toString().replace(/\/$/, '')
      }
    } catch {
      // Ignore and use the raw value.
    }

    return value.replace(/\/$/, '')
  })()
}

setWorldConstructor(CustomWorld)

Before(async function () {

  this.browser = await chromium.launch({
    headless: true,
    slowMo: 0,
    devtools: false
  })

  // ✅ guardar context
  this.context = await this.browser.newContext({
    ignoreHTTPSErrors: true
  })

  this.page = await this.context.newPage()

})

After(async function () {
  await this.page?.close()
  await this.context?.close()
  await this.browser?.close()
})

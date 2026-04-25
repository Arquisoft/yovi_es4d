import { setWorldConstructor, Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium } from 'playwright'

setDefaultTimeout(60_000)

class CustomWorld {
  browser = null
  context = null
  page = null
  BASE_URL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:5173' : 'https://localhost:5173')
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

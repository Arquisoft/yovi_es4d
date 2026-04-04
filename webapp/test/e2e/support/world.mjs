// features/support/world.js
import { setWorldConstructor } from '@cucumber/cucumber'
import { chromium } from 'playwright'

class CustomWorld {
    async init() {
        this.browser = await chromium.launch({ headless: process.env.HEADLESS !== 'false' })
        this.context = await this.browser.newContext()
        this.page = await this.context.newPage()
        this.mockBotModesResponse = false
        this.mockBotModesData = null
        this.mockBotModesStatus = 200
    }

    async close() {
        if (this.page) await this.page.close()
        if (this.context) await this.context.close()
        if (this.browser) await this.browser.close()
    }
}

setWorldConstructor(CustomWorld)
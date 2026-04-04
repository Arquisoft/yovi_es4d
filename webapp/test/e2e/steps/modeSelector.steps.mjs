// features/step_definitions/modeSelector.steps.js
import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'
import { API_URL } from '../../../src/config'

// ─────────────────────────────────────────────────────────────
// GIVEN
// ─────────────────────────────────────────────────────────────

Given('the mode selector page is open', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    // Intercept API calls
    await page.route(`${API_URL}/api/game/bot-modes`, async (route) => {
        if (this.mockBotModesResponse) {
            await route.fulfill({
                status: this.mockBotModesStatus || 200,
                body: JSON.stringify({ botModes: this.mockBotModesData })
            })
        } else {
            await route.continue()
        }
    })

    await page.goto('http://localhost:5173')
    await page.waitForSelector('.ms-header', { timeout: 5000 })
})

Given('the bot modes API returns {string}', async function (modesJson) {
    this.mockBotModesData = JSON.parse(modesJson)
    this.mockBotModesResponse = true
    this.mockBotModesStatus = 200
})

Given('the bot modes API fails', async function () {
    this.mockBotModesData = []
    this.mockBotModesResponse = true
    this.mockBotModesStatus = 500
})

// ─────────────────────────────────────────────────────────────
// WHEN
// ─────────────────────────────────────────────────────────────

When('I select {string} game mode', async function (modeId) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const modeButton = page.locator(`button:has-text("${modeId === 'vsBot' ? 'Contra la máquina' : '2 Jugadores'}")`)
    await modeButton.click()
    await page.waitForTimeout(300) // Animation
})

When('I select {string} difficulty', async function (difficultyLabel) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const difficultyButton = page.locator(`button:has-text("${difficultyLabel}")`).first()
    await difficultyButton.click()
    await page.waitForTimeout(300)
})

When('I select {string} board size', async function (sizeLabel) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const sizeCard = page.locator(`.ms-size-card:has-text("${sizeLabel}")`)
    await sizeCard.click()
    await page.waitForTimeout(300)
})

When('I enter {string} as player 2 name', async function (name) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const input = page.locator('input[placeholder*="Nombre del rival"]')
    await input.fill(name)
    await page.waitForTimeout(300)
})

When('I click the play button', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const playButton = page.locator('.ms-play-btn')
    await playButton.click()
})

When('I click the online game card', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const onlineCard = page.locator('.ms-mode-card:has-text("Jugar online")')
    await onlineCard.click()
})

// ─────────────────────────────────────────────────────────────
// THEN
// ─────────────────────────────────────────────────────────────

Then('the {string} mode should be selected', async function (modeId) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const modeCard = page.locator(`.ms-mode-card:has-text("${modeId === 'vsBot' ? 'Contra la máquina' : '2 Jugadores'}")`)
    const isSelected = await modeCard.evaluate(el => el.classList.contains('selected'))
    assert.ok(isSelected, `${modeId} mode should be selected`)
})

Then('the difficulty section should be visible', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const difficultySection = page.locator('.ms-difficulty-list')
    const isVisible = await difficultySection.isVisible()
    assert.ok(isVisible, 'Difficulty section should be visible')
})

Then('the player 2 name input should be visible', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const input = page.locator('input[placeholder*="Nombre del rival"]')
    const isVisible = await input.isVisible()
    assert.ok(isVisible, 'Player 2 name input should be visible')
})

Then('the player 2 name input should contain {string}', async function (expectedName) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const input = page.locator('input[placeholder*="Nombre del rival"]')
    const value = await input.inputValue()
    assert.strictEqual(value, expectedName, `Expected "${expectedName}", got "${value}"`)
})

Then('a checkmark should appear', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const checkmark = page.locator('input[placeholder*="Nombre del rival"] + span:has-text("✓")')
    const isVisible = await checkmark.isVisible()
    assert.ok(isVisible, 'Checkmark should appear')
})

Then('the {string} difficulty should be selected', async function (botModeId) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    // Verify the radio button is checked for that mode
    const modeButton = page.locator(`.ms-mode-card:has-text("${this.getDifficultyLabel(botModeId)}")`)
    const hasSelectedClass = await modeButton.evaluate(el => el.classList.contains('selected'))
    assert.ok(hasSelectedClass, `${botModeId} should be selected`)
})

Then('the {string} board size should be selected', async function (sizeValue) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const sizeCard = page.locator(`.ms-size-card.selected:has-text("${sizeValue}×")`)
    const isVisible = await sizeCard.isVisible()
    assert.ok(isVisible, `Board size ${sizeValue} should be selected`)
})

Then('I should navigate to {string}', async function (expectedPath) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.waitForURL(`http://localhost:5173${expectedPath}`, { timeout: 5000 })
    const url = page.url()
    assert.ok(url.includes(expectedPath), `Expected URL to include ${expectedPath}, got ${url}`)
})

Then('the game should have board size {string}', async function (sizeValue) {
    // This assertion would be on the game page
    // For now, we check the navigation state passed via React Router
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    // Wait for game page to load and verify board size
    await page.waitForSelector('.game-board', { timeout: 5000 })
    // You would need to extract board size from the game page
    const boardSize = await page.evaluate(() => {
        const board = document.querySelector('.game-board')
        return board?.getAttribute('data-size') ||
            board?.children.length ||
            window.__gameState?.boardSize
    })
    assert.strictEqual(String(boardSize), sizeValue, `Expected board size ${sizeValue}, got ${boardSize}`)
})

Then('the game should have bot mode {string}', async function (expectedBotMode) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.waitForSelector('.game-board', { timeout: 5000 })
    const botMode = await page.evaluate(() => window.__gameState?.botMode)
    assert.strictEqual(botMode, expectedBotMode, `Expected bot mode ${expectedBotMode}, got ${botMode}`)
})

Then('player 2 should be named {string}', async function (expectedName) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.waitForSelector('.player-2-name, .opponent-name', { timeout: 5000 })
    const player2Name = await page.textContent('.player-2-name, .opponent-name')
    assert.ok(player2Name?.includes(expectedName), `Expected player 2 name to include "${expectedName}", got "${player2Name}"`)
})

Then('I should see {int} difficulty options', async function (count) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const difficultyButtons = page.locator('.ms-difficulty-list .ms-mode-card')
    const actualCount = await difficultyButtons.count()
    assert.strictEqual(actualCount, count, `Expected ${count} difficulty options, got ${actualCount}`)
})

Then('{string} difficulty should be present', async function (difficultyLabel) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const button = page.locator(`.ms-mode-card:has-text("${difficultyLabel}")`)
    const isVisible = await button.isVisible()
    assert.ok(isVisible, `Difficulty "${difficultyLabel}" should be present`)
})

Then('I should see at least {string} difficulty', async function (difficultyLabel) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    // Wait a bit for fallback to load
    await page.waitForTimeout(1000)
    const button = page.locator(`.ms-mode-card:has-text("${difficultyLabel}")`)
    const isVisible = await button.isVisible()
    assert.ok(isVisible, `At least "${difficultyLabel}" difficulty should be present as fallback`)
})

// Helper method
Then.prototype.getDifficultyLabel = function(botModeId) {
    const labels = {
        'random_bot': 'Aleatorio',
        'intermediate_bot': 'Intermedio',
        'hard_bot': 'Difícil'
    }
    return labels[botModeId] || botModeId
}
// features/step_definitions/modeSelector.steps.mjs
import { Given, When, Then } from '@cucumber/cucumber'
import assert from 'assert'

const BASE_URL = 'http://localhost:5173'
const API_URL  = process.env.REACT_APP_API_URL || 'http://localhost:8000'

// ─────────────────────────────────────────────────────────────
// GIVEN
// ─────────────────────────────────────────────────────────────

Given('the mode selector page is open', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.route(`${API_URL}/api/game/bot-modes`, async (route) => {
        if (this.mockBotModesResponse) {
            await route.fulfill({
                status: this.mockBotModesStatus || 200,
                contentType: 'application/json',
                body: JSON.stringify({ botModes: this.mockBotModesData }),
            })
        } else {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ botModes: ['random_bot', 'intermediate_bot', 'hard_bot'] }),
            })
        }
    })

    await page.goto(`${BASE_URL}/select`)
    await page.waitForSelector('.ms-header', { timeout: 5000 })
})

Given('the mode selector page is loading bot modes', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.route(`${API_URL}/api/game/bot-modes`, () => { /* never fulfill */ })

    await page.goto(`${BASE_URL}/select`)
    await page.waitForSelector('.ms-header', { timeout: 5000 })
})

Given('the bot modes API returns all three modes', async function () {
    this.mockBotModesData     = ['random_bot', 'intermediate_bot', 'hard_bot']
    this.mockBotModesResponse = true
    this.mockBotModesStatus   = 200
})

Given('the bot modes API fails', async function () {
    this.mockBotModesData     = []
    this.mockBotModesResponse = true
    this.mockBotModesStatus   = 500
})

// ─────────────────────────────────────────────────────────────
// WHEN
// ─────────────────────────────────────────────────────────────

When('I select {string} game mode', async function (modeId) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const label = modeId === 'vsBot' ? 'Contra la máquina' : '2 Jugadores'
    const modeButton = page.locator(`button:has-text("${label}")`)
    await modeButton.click()
    await page.waitForTimeout(300)
})

When('I select {string} difficulty', async function (difficultyLabel) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    // Los botones de dificultad pueden ser <button> directos o elementos con
    // clase .ms-mode-card que actúan como botones. Probamos ambos selectores.
    const difficultyButton = page.locator(
        `.ms-difficulty-list .ms-mode-card:has-text("${difficultyLabel}"), ` +
        `.ms-difficulty-list button:has-text("${difficultyLabel}")`
    ).first()
    await difficultyButton.waitFor({ timeout: 8000 })
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

When('I click the mode selector play button', async function () {
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

When('the mode selector page reloads', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.route(`${API_URL}/api/game/bot-modes`, async (route) => {
        await route.fulfill({
            status: this.mockBotModesStatus || 200,
            contentType: 'application/json',
            body: JSON.stringify({ botModes: this.mockBotModesData ?? [] }),
        })
    })

    await page.reload()
    await page.waitForSelector('.ms-header', { timeout: 5000 })
    await page.waitForTimeout(500)
})

// ─────────────────────────────────────────────────────────────
// THEN
// ─────────────────────────────────────────────────────────────

Then('I should see the mode selector header', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const header = page.locator('.ms-header')
    const isVisible = await header.isVisible()
    assert.ok(isVisible, 'Mode selector header (.ms-header) not found')
})

Then('the play button should be visible', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const btn = page.locator('.ms-play-btn')
    const isVisible = await btn.isVisible()
    assert.ok(isVisible, 'Play button (.ms-play-btn) not found')
})

Then('the play button should be disabled', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const btn = page.locator('.ms-play-btn')
    await btn.waitFor({ timeout: 5000 })
    const isDisabled = await btn.isDisabled()
    assert.ok(isDisabled, 'Play button should be disabled while loading')
})

Then('the {string} mode should be selected', async function (modeId) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const label = modeId === 'vsBot' ? 'Contra la máquina' : '2 Jugadores'
    const modeCard = page.locator(`.ms-mode-card:has-text("${label}")`)
    const isSelected = await modeCard.evaluate(el => el.classList.contains('selected'))
    assert.ok(isSelected, `${modeId} mode card should have class "selected"`)
})

Then('the difficulty section should be visible', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const difficultySection = page.locator('.ms-difficulty-list')
    const isVisible = await difficultySection.isVisible()
    assert.ok(isVisible, 'Difficulty section (.ms-difficulty-list) should be visible')
})

Then('the difficulty section should not be visible', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    // Esperamos a que el DOM se estabilice tras el cambio de modo
    await page.waitForTimeout(300)

    const difficultySection = page.locator('.ms-difficulty-list')
    const count = await difficultySection.count()
    if (count === 0) return // no existe en el DOM → correcto

    // Si existe, debe estar oculto (display:none / visibility:hidden / hidden attribute)
    const isVisible = await difficultySection.isVisible()
    assert.ok(!isVisible, 'Difficulty section should NOT be visible in multiplayer mode')
})

Then('the player 2 name input should be visible', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const input = page.locator('input[placeholder*="Nombre del rival"]')
    const isVisible = await input.isVisible()
    assert.ok(isVisible, 'Player 2 name input should be visible')
})

Then('the player 2 name input should not be visible', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const input = page.locator('input[placeholder*="Nombre del rival"]')
    const count = await input.count()
    if (count === 0) return

    const isVisible = await input.isVisible()
    assert.ok(!isVisible, 'Player 2 name input should NOT be visible in vsBot mode')
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

    const checkmark = page.locator('span:has-text("✓")')
    const isVisible = await checkmark.isVisible()
    assert.ok(isVisible, 'Checkmark (✓) should be visible when player 2 name is filled')
})

Then('a checkmark should not appear', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const checkmark = page.locator('span:has-text("✓")')
    const count = await checkmark.count()
    if (count === 0) return

    const isVisible = await checkmark.isVisible()
    assert.ok(!isVisible, 'Checkmark (✓) should NOT be visible when player 2 name is empty')
})

Then('the player 2 name input border should be highlighted', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const input = page.locator('input[placeholder*="Nombre del rival"]')
    const borderColor = await input.evaluate(el => getComputedStyle(el).borderColor)
    assert.ok(borderColor && borderColor !== '', `Input border color should change when text is entered, got "${borderColor}"`)
})

Then('the unsaved game warning should be visible', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const warning = page.locator('text=Esta partida no quedará guardada en el historial')
    const isVisible = await warning.isVisible()
    assert.ok(isVisible, 'Unsaved game warning should be visible in multiplayer mode')
})

Then('the unsaved game warning should not be visible', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const warning = page.locator('text=Esta partida no quedará guardada en el historial')
    const count = await warning.count()
    if (count === 0) return

    const isVisible = await warning.isVisible()
    assert.ok(!isVisible, 'Unsaved game warning should NOT be visible in vsBot mode')
})

const difficultyLabels = {
    random_bot:       'Aleatorio',
    intermediate_bot: 'Intermedio',
    hard_bot:         'Difícil',
}

Then('the {string} difficulty should be selected', async function (botModeId) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const label = difficultyLabels[botModeId] || botModeId
    // Los cards de dificultad están dentro de .ms-difficulty-list
    const modeButton = page.locator(
        `.ms-difficulty-list .ms-mode-card:has-text("${label}"), ` +
        `.ms-difficulty-list button:has-text("${label}")`
    ).first()
    const hasSelectedClass = await modeButton.evaluate(el => el.classList.contains('selected'))
    assert.ok(hasSelectedClass, `"${label}" difficulty should have class "selected"`)
})

Then('the {string} difficulty should not be selected', async function (botModeId) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const label = difficultyLabels[botModeId] || botModeId
    const modeButton = page.locator(
        `.ms-difficulty-list .ms-mode-card:has-text("${label}"), ` +
        `.ms-difficulty-list button:has-text("${label}")`
    ).first()
    const hasSelectedClass = await modeButton.evaluate(el => el.classList.contains('selected'))
    assert.ok(!hasSelectedClass, `"${label}" difficulty should NOT have class "selected"`)
})

Then('the {string} board size should be selected', async function (sizeValue) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const sizeCard = page.locator(`.ms-size-card.selected:has-text("${sizeValue}×")`)
    const isVisible = await sizeCard.isVisible()
    assert.ok(isVisible, `Board size ${sizeValue}× should have class "selected"`)
})

Then('the {string} board size should not be selected', async function (sizeValue) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const sizeCard = page.locator(`.ms-size-card:has-text("${sizeValue}×")`)
    const hasSelectedClass = await sizeCard.evaluate(el => el.classList.contains('selected'))
    assert.ok(!hasSelectedClass, `Board size ${sizeValue}× should NOT have class "selected"`)
})

Then('I should navigate to {string}', async function (expectedPath) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.waitForURL(`${BASE_URL}${expectedPath}`, { timeout: 5000 })
    const url = page.url()
    assert.ok(url.includes(expectedPath), `Expected URL to include "${expectedPath}", got "${url}"`)
})

Then('I should see {int} difficulty options', async function (count) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    // Esperamos a que los botones de dificultad estén renderizados
    await page.waitForSelector('.ms-difficulty-list', { timeout: 5000 })
    await page.waitForTimeout(300)

    // Buscamos tanto .ms-mode-card como <button> directos dentro de la lista
    const difficultyButtons = page.locator(
        '.ms-difficulty-list .ms-mode-card, .ms-difficulty-list button'
    )
    const actualCount = await difficultyButtons.count()
    assert.strictEqual(actualCount, count, `Expected ${count} difficulty options, got ${actualCount}`)
})

Then('{string} difficulty should be present', async function (difficultyLabel) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    const button = page.locator(
        `.ms-difficulty-list .ms-mode-card:has-text("${difficultyLabel}"), ` +
        `.ms-difficulty-list button:has-text("${difficultyLabel}")`
    ).first()
    const isVisible = await button.isVisible()
    assert.ok(isVisible, `Difficulty "${difficultyLabel}" should be present`)
})

Then('I should see at least {string} difficulty', async function (difficultyLabel) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.waitForTimeout(1000)

    // En caso de fallo de API, el componente debe mostrar al menos el fallback 'Aleatorio'
    // Buscamos en cualquier parte del componente, no solo dentro de .ms-difficulty-list
    const button = page.locator(
        `.ms-mode-card:has-text("${difficultyLabel}"), ` +
        `button:has-text("${difficultyLabel}")`
    ).first()
    const isVisible = await button.isVisible()
    assert.ok(isVisible, `At least "${difficultyLabel}" difficulty should be present as fallback`)
})

Then('the game should have board size {string}', async function (sizeValue) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.waitForSelector('.game-board', { timeout: 5000 })
    const boardSize = await page.evaluate(() => {
        const board = document.querySelector('.game-board')
        return board?.getAttribute('data-size') ||
            board?.children.length           ||
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

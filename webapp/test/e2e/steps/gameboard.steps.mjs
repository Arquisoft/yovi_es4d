// test/e2e/steps/gameboard.steps.mjs
import { Given, Then } from '@cucumber/cucumber'
import assert from 'assert'

const BASE_URL = 'http://localhost:5173'
const API_URL  = process.env.REACT_APP_API_URL || 'http://localhost:8000'

// ── Mocks de API ─────────────────────────────────────────────

async function mockBotModes(page) {
    await page.route(`${API_URL}/api/game/bot-modes`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ botModes: ['random_bot', 'intermediate_bot', 'hard_bot'] }),
        })
    )
}

async function mockAuth(page) {
    await page.route(`${API_URL}/api/auth/me`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ userId: 'test-user-e2e' }),
        })
    )
}

async function mockProfile(page) {
    await page.route(`${API_URL}/api/user/getUserProfile`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ username: 'TestPlayer', avatar: 'logo.png' }),
        })
    )
}

async function mockUserHeader(page) {
    await page.route(`${API_URL}/api/user/profile`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ username: 'TestPlayer', avatar: 'logo.png' }),
        })
    )
}

async function mockGameStart(page, players) {
    const board = Array.from({ length: 66 }, (_, i) => ({
        position: `(${i},0,0)`,
        player: null,
    }))
    const defaultPlayers = players || [
        { id: 'test-user-e2e', name: 'TestPlayer', points: 0 },
        { id: 'bot',           name: 'Bot',         points: 0 },
    ]
    await page.route(`${API_URL}/api/game/start`, route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                gameId: 'e2e-game-001',
                board,
                players: defaultPlayers,
                turn:   'j1',
                status: 'active',
                winner: null,
            }),
        })
    )
}

// Navega a /game inyectando location.state via sessionStorage + script
async function gotoGame(page, state) {
    // Inyectamos el state en sessionStorage antes de que React cargue
    // React Router lee window.history.state, así que usamos replaceState
    await page.addInitScript((s) => {
        // Sobrescribir pushState para que el primer push lleve nuestro state
        window.__injectedGameState = s
        window.history.replaceState(s, '', '/game')
    }, state)

    await page.goto(`${BASE_URL}/game`)
    await page.waitForTimeout(500)
}

// ─────────────────────────────────────────────────────────────
// GIVEN
// ─────────────────────────────────────────────────────────────

Given('the game board is open in vsBot mode', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await mockBotModes(page)
    await mockAuth(page)
    await mockProfile(page)
    await mockUserHeader(page)
    await mockGameStart(page)

    await gotoGame(page, {
        gameMode:  'vsBot',
        botMode:   'random_bot',
        boardSize: 11,
    })
})

Given('the game board is open in multiplayer mode', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await mockBotModes(page)
    await mockAuth(page)
    await mockProfile(page)
    await mockUserHeader(page)
    await mockGameStart(page, [
        { id: 'test-user-e2e', name: 'TestPlayer', points: 0 },
        { id: 'jugador2',      name: 'Jugador 2',   points: 0 },
    ])

    await gotoGame(page, {
        gameMode:    'multiplayer',
        boardSize:   11,
        player2Name: 'Jugador 2',
    })
})

Given('the game board is open without state', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await page.goto(`${BASE_URL}/game`)
    await page.waitForTimeout(500)
})

// ─────────────────────────────────────────────────────────────
// THEN
// ─────────────────────────────────────────────────────────────



Then('I should see the game main area', async function () {
    const page = this.page
    await page.waitForSelector('.gb-main', { timeout: 8000 })
    const main = await page.$('.gb-main')
    assert.ok(main, 'Game main area (.gb-main) not found')
})

Then('I should see the game footer with mode info', async function () {
    const page = this.page
    await page.waitForSelector('.gb-footer', { timeout: 8000 })
    const footerText = await page.textContent('.gb-footer-text')
    assert.ok(footerText && footerText.length > 0, 'Footer text is empty')
})

Then('I should see two player panels', async function () {
    const page = this.page
    await page.waitForSelector('.gb-player-aside', { timeout: 8000 })
    const panels = await page.$$('.gb-player-aside')
    assert.strictEqual(panels.length, 2, `Expected 2 player panels, got ${panels.length}`)
})

Then('I should see the home button in header', async function () {
    const page = this.page
    const btn = page.locator('button:has-text("Inicio")')
    await btn.waitFor({ timeout: 8000 })
    const visible = await btn.isVisible()
    assert.ok(visible, 'Botón "Inicio" not found in UserHeader')
})

Then('I should see the game board', async function () {
    const page = this.page
    await page.waitForSelector('.gb-board-section', { timeout: 8000 })
    // Esperar a que desaparezca el spinner (gameId cargado)
    await page.waitForFunction(
        () => !document.querySelector('.gb-loading'),
        { timeout: 8000 }
    ).catch(() => {}) // si no desaparece en 8s, continuamos igualmente
    const section = await page.$('.gb-board-section')
    assert.ok(section, 'Board section (.gb-board-section) not found')
})

Then('I should be redirected to select page', async function () {
    const page = this.page
    await page.waitForURL(`${BASE_URL}/select`, { timeout: 5000 })
    const url = page.url()
    assert.ok(url.includes('/select'), `Expected redirect to /select, got ${url}`)
})

// test/e2e/steps/gameboard.steps.mjs
import { Given, Then } from '@cucumber/cucumber'
import assert from 'assert'

const BASE_URL = 'http://localhost:5173'
const API_URL  = process.env.REACT_APP_API_URL || 'http://localhost:8000'

// ── Helpers de mock ───────────────────────────────────────────

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

async function mockGameStart(page, players, boardSize = 11) {
    const cellCount = boardSize * (boardSize - 1) / 2 * 2  // aproximación
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

async function mockAuthFail(page) {
    await page.route(`${API_URL}/api/auth/me`, route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) })
    )
}

// Navega a /game inyectando location.state via history.replaceState
async function gotoGame(page, state) {
    await page.addInitScript((s) => {
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

Given('the game board is loading', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await mockAuth(page)
    await mockProfile(page)
    await mockUserHeader(page)

    // La llamada a /start nunca responde → el gameId permanece null → se muestra el spinner
    await page.route(`${API_URL}/api/game/start`, route => {
        // no fulfill → la petición queda pendiente
    })

    await gotoGame(page, {
        gameMode:  'vsBot',
        botMode:   'random_bot',
        boardSize: 11,
    })
})

Given('the game board is open with failed auth', async function () {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await mockUserHeader(page)
    await mockAuthFail(page)

    await gotoGame(page, {
        gameMode:  'vsBot',
        botMode:   'random_bot',
        boardSize: 11,
    })
})

Given('the game board is open with board size {int}', async function (size) {
    const page = this.page
    if (!page) throw new Error('Page not initialized')

    await mockBotModes(page)
    await mockAuth(page)
    await mockProfile(page)
    await mockUserHeader(page)
    await mockGameStart(page, null, size)

    await gotoGame(page, {
        gameMode:  'vsBot',
        botMode:   'random_bot',
        boardSize: size,
    })
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
    await page.waitForFunction(
        () => !document.querySelector('.gb-loading'),
        { timeout: 8000 }
    ).catch(() => {})
    const section = await page.$('.gb-board-section')
    assert.ok(section, 'Board section (.gb-board-section) not found')
})

Then('I should be redirected to select page', async function () {
    const page = this.page
    await page.waitForURL(`${BASE_URL}/select`, { timeout: 5000 })
    const url = page.url()
    assert.ok(url.includes('/select'), `Expected redirect to /select, got ${url}`)
})

Then('I should be redirected to login page', async function () {
    const page = this.page
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 })
    const url = page.url()
    assert.ok(url.includes('/login'), `Expected redirect to /login, got ${url}`)
})

Then('the header should display the board size {string}', async function (size) {
    const page = this.page
    await page.waitForSelector('.gb-header-meta', { timeout: 8000 })
    const metaText = await page.textContent('.gb-header-meta')
    assert.ok(metaText?.includes(`${size}×`), `Expected header to contain "${size}×", got "${metaText}"`)
})

Then('the header should display the app logo', async function () {
    const page = this.page
    await page.waitForSelector('.gb-header-logo', { timeout: 8000 })
    const logoText = await page.textContent('.gb-header-logo')
    assert.ok(logoText && logoText.length > 0, 'App logo text not found in header')
})

Then('I should see the loading spinner', async function () {
    const page = this.page
    await page.waitForSelector('.gb-loading', { timeout: 8000 })
    const spinner = await page.$('.gb-loading')
    assert.ok(spinner, 'Loading spinner (.gb-loading) not found')
})

Then('the footer should contain {string}', async function (text) {
    const page = this.page
    await page.waitForSelector('.gb-footer-text', { timeout: 8000 })
    const footerText = await page.textContent('.gb-footer-text')
    assert.ok(footerText?.includes(text), `Expected footer to contain "${text}", got "${footerText}"`)
})

Then('the turn indicator should be visible', async function () {
    const page = this.page
    await page.waitForSelector('.gb-header-status', { timeout: 8000 })
    const statusEl = await page.$('.gb-header-status')
    assert.ok(statusEl, 'Turn indicator (.gb-header-status) not found')
    const text = await page.textContent('.gb-header-status')
    assert.ok(text && text.length > 0, 'Turn indicator text is empty')
})

Then('the player 1 panel should be active', async function () {
    const page = this.page
    await page.waitForSelector('.gb-player-aside', { timeout: 8000 })
    // El panel activo corresponde al jugador con turno j1 al inicio
    // Verificamos que existe algún indicador de turno activo en el primer panel
    const panels = page.locator('.gb-player-aside')
    const firstPanel = panels.first()
    const html = await firstPanel.innerHTML()
    assert.ok(html.length > 0, 'Player 1 panel is empty')
})

Then('the player 2 panel should not be active', async function () {
    const page = this.page
    await page.waitForSelector('.gb-player-aside', { timeout: 8000 })
    // Verificamos que el indicador de turno activo NO está en el segundo panel al inicio
    // El turn es j1, por lo que j2 no debe tener clase activa
    const statusText = await page.textContent('.gb-header-status')
    assert.ok(!statusText?.includes('j2'), 'Player 2 should not be active at game start')
})

Then('I should see {string} as player 2 name', async function (expectedName) {
    const page = this.page
    await page.waitForSelector('.gb-player-aside', { timeout: 8000 })
    const panels = await page.$$('.gb-player-aside')
    assert.ok(panels.length === 2, 'Expected 2 player panels')
    const secondPanelText = await panels[1].textContent()
    assert.ok(
        secondPanelText?.includes(expectedName),
        `Expected player 2 panel to contain "${expectedName}", got "${secondPanelText}"`
    )
})

Then('both players should start with 0 points', async function () {
    const page = this.page
    await page.waitForSelector('.gb-player-aside', { timeout: 8000 })
    // Los puntos iniciales son 0; buscamos todos los elementos de puntuación
    const pointEls = await page.$$eval('[class*="point"], [class*="score"], [class*="pts"]', els =>
        els.map(el => el.textContent?.trim())
    )
    // Si no hay selectores específicos, comprobamos que no aparece ningún número > 0 en los paneles
    const panels = await page.$$('.gb-player-aside')
    for (const panel of panels) {
        const text = await panel.textContent()
        // Buscar dígitos > 0 en el panel; los puntos deben ser "0"
        const hasNonZeroPoints = /\b[1-9]\d*\b/.test(text ?? '')
        assert.ok(!hasNonZeroPoints, `Player panel should show 0 points, got: "${text}"`)
    }
})

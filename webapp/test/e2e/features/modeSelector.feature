# features/mode_selector.feature
Feature: Mode Selector - Configuracion de partida

  Background:
    Given the mode selector page is open

  # ── Renderizado inicial ───────────────────────────────────────

  Scenario: La cabecera de configuración es visible
    Then I should see the mode selector header

  Scenario: El botón de jugar está visible
    Then the play button should be visible

  Scenario: La sección de dificultad es visible en modo vsBot por defecto
    Then the difficulty section should be visible

  # ── Cambio de modo de juego ───────────────────────────────────

  Scenario: El aviso de partida no guardada no aparece en vsBot
    Then the unsaved game warning should not be visible


  # ── Navegación online ─────────────────────────────────────────

  Scenario: Navegar a lobby online
    When I click the online game card
    Then I should navigate to "/online-lobby"

  # ── Inicio de partida ─────────────────────────────────────────

  Scenario: Pulsar jugar navega a la página de juego
    When I click the mode selector play button
    Then I should navigate to "/game"

  Scenario: El botón de jugar está deshabilitado mientras carga las dificultades
    Given the mode selector page is loading bot modes
    Then the play button should be disabled

  # ── API de modos del bot ──────────────────────────────────────

  Scenario: Se muestra al menos Aleatorio cuando la API falla
    Given the bot modes API fails
    When the mode selector page reloads
    Then I should see at least "Aleatorio" difficulty

# features/mode_selector.feature
Feature: Mode Selector - Configuracion de partida

  Background:
    Given the mode selector page is open

  # ── Renderizado inicial ───────────────────────────────────────

  Scenario: La cabecera de configuración es visible
    Then I should see the mode selector header

  Scenario: El botón de jugar está visible
    Then the play button should be visible

  Scenario: El modo vsBot está seleccionado por defecto
    Then the "vsBot" mode should be selected

  Scenario: El tablero de tamaño Normal (11×) está seleccionado por defecto
    Then the "11" board size should be selected

  Scenario: La sección de dificultad es visible en modo vsBot por defecto
    Then the difficulty section should be visible

  # ── Cambio de modo de juego ───────────────────────────────────

  Scenario: Seleccionar modo multijugador local
    When I select "multiplayer" game mode
    Then the "multiplayer" mode should be selected
    And the player 2 name input should be visible

  Scenario: La sección de dificultad desaparece al cambiar a multiplayer
    When I select "multiplayer" game mode
    Then the difficulty section should not be visible

  Scenario: Volver a vsBot oculta el campo de nombre del jugador 2
    When I select "multiplayer" game mode
    And I select "vsBot" game mode
    Then the player 2 name input should not be visible

  Scenario: Se muestra el aviso de partida no guardada en multiplayer
    When I select "multiplayer" game mode
    Then the unsaved game warning should be visible

  Scenario: El aviso de partida no guardada no aparece en vsBot
    Then the unsaved game warning should not be visible

  # ── Nombre del jugador 2 ──────────────────────────────────────

  Scenario: Cambiar nombre del jugador 2
    When I select "multiplayer" game mode
    And I enter "Mi Amigo" as player 2 name
    Then the player 2 name input should contain "Mi Amigo"
    And a checkmark should appear

  Scenario: El input acepta hasta 20 caracteres
    When I select "multiplayer" game mode
    And I enter "NombreMuyLargoQueSupera" as player 2 name
    Then the player 2 name input should contain "NombreMuyLargoQueSuper"

  Scenario: El checkmark no aparece si el nombre está vacío
    When I select "multiplayer" game mode
    Then a checkmark should not appear

  Scenario: El borde del input cambia al escribir un nombre
    When I select "multiplayer" game mode
    And I enter "Ana" as player 2 name
    Then the player 2 name input border should be highlighted

  # ── Dificultad del bot ────────────────────────────────────────

  Scenario: Cambiar dificultad a Intermedio
    When I select "Intermedio" difficulty
    Then the "intermediate_bot" difficulty should be selected

  Scenario: Cambiar dificultad a Difícil
    When I select "Difícil" difficulty
    Then the "hard_bot" difficulty should be selected

  Scenario: Cambiar dificultad a Aleatorio
    When I select "Difícil" difficulty
    And I select "Aleatorio" difficulty
    Then the "random_bot" difficulty should be selected

  Scenario: Solo un nivel de dificultad puede estar seleccionado a la vez
    When I select "Intermedio" difficulty
    Then the "random_bot" difficulty should not be selected

  # ── Tamaño del tablero ────────────────────────────────────────

  Scenario: Cambiar tamaño del tablero a Grande
    When I select "Grande" board size
    Then the "15" board size should be selected

  Scenario: Cambiar tamaño del tablero a Pequeño
    When I select "Pequeño" board size
    Then the "8" board size should be selected

  Scenario: Cambiar tamaño del tablero a Extra
    When I select "Extra" board size
    Then the "19" board size should be selected

  Scenario: Solo un tamaño de tablero puede estar seleccionado a la vez
    When I select "Grande" board size
    Then the "11" board size should not be selected

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

  Scenario: Se muestran los tres modos de dificultad cuando la API devuelve todos
    Given the bot modes API returns all three modes
    When the mode selector page reloads
    Then I should see 3 difficulty options
    And "Aleatorio" difficulty should be present
    And "Intermedio" difficulty should be present
    And "Difícil" difficulty should be present

  Scenario: Se muestra al menos Aleatorio cuando la API falla
    Given the bot modes API fails
    When the mode selector page reloads
    Then I should see at least "Aleatorio" difficulty

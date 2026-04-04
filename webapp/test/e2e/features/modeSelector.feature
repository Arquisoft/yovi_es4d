# features/mode_selector.feature
Feature: Mode Selector - Configuración de partida

  Background:
    Given the mode selector page is open

  Scenario: Seleccionar modo vs Bot por defecto
    When I select "vsBot" game mode
    Then the "vsBot" mode should be selected
    And the difficulty section should be visible

  Scenario: Seleccionar modo multijugador local
    When I select "multiplayer" game mode
    Then the "multiplayer" mode should be selected
    And the player 2 name input should be visible

  Scenario: Cambiar nombre del jugador 2
    When I select "multiplayer" game mode
    And I enter "Mi Amigo" as player 2 name
    Then the player 2 name input should contain "Mi Amigo"
    And a checkmark should appear

  Scenario: Cambiar dificultad del bot
    When I select "vsBot" game mode
    And I select "Intermedio" difficulty
    Then the "intermediate_bot" mode should be selected

  Scenario: Cambiar tamaño del tablero
    When I select "Grande" board size
    Then the "15" board size should be selected

  Scenario: Navegar a juego local con configuración
    When I select "multiplayer" game mode
    And I enter "Rival" as player 2 name
    And I select "Extra" board size
    And I click the play button
    Then I should navigate to "/game"
    And the game should have board size "19"
    And player 2 should be named "Rival"

  Scenario: Navegar a juego vs Bot con configuración
    When I select "vsBot" game mode
    And I select "Difícil" difficulty
    And I select "Normal" board size
    And I click the play button
    Then I should navigate to "/game"
    And the game should have bot mode "hard_bot"

  Scenario: Navegar a lobby online
    When I click the online game card
    Then I should navigate to "/online-lobby"

  Scenario: Verificar carga de modos de bot desde API
    Given the bot modes API returns ["random_bot", "intermediate_bot", "hard_bot"]
    Then I should see 3 difficulty options
    And "Aleatorio" difficulty should be present
    And "Intermedio" difficulty should be present
    And "Difícil" difficulty should be present

  Scenario: Manejar error en carga de modos de bot
    Given the bot modes API fails
    Then I should see at least "Aleatorio" difficulty
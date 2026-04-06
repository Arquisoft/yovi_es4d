# features/mode_selector.feature
Feature: Mode Selector - Configuracion de partida

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

  Scenario: Cambiar tamano del tablero
    When I select "Grande" board size
    Then the "15" board size should be selected

  Scenario: Navegar a lobby online
    When I click the online game card
    Then I should navigate to "/online-lobby"

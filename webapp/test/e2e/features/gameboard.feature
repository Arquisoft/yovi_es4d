# features/gameboard.feature
Feature: GameBoard - Partida en curso


  Scenario: Muestra la sección principal de juego
    Given the game board is open in vsBot mode
    Then I should see the game main area

  Scenario: Muestra el footer con el modo de juego
    Given the game board is open in vsBot mode
    Then I should see the game footer with mode info

  Scenario: Muestra los dos paneles de jugadores
    Given the game board is open in vsBot mode
    Then I should see two player panels

  Scenario: El botón Inicio del UserHeader está visible
    Given the game board is open in vsBot mode
    Then I should see the home button in header

  Scenario: Muestra el tablero cuando la partida se carga
    Given the game board is open in vsBot mode
    Then I should see the game board

  Scenario: Modo multiplayer muestra dos jugadores locales
    Given the game board is open in multiplayer mode
    Then I should see two player panels

  Scenario: Redirige a select si no hay state
    Given the game board is open without state
    Then I should be redirected to select page

# features/gameboard.feature
Feature: GameBoard - Partida en curso

  Scenario: El boton Inicio del UserHeader esta visible
    Given the game board is open in vsBot mode
    Then I should see the home button in header

  Scenario: Redirige a select si no hay state
    Given the game board is open without state
    Then I should be redirected to select page

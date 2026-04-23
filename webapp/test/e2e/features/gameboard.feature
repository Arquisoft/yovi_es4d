# features/gameboard.feature
Feature: GameBoard - Partida en curso

  # ── Estructura y layout ───────────────────────────────────────

  Scenario: El botón Inicio del UserHeader está visible
    Given the game board is open in vsBot mode
    Then I should see the home button in header

  Scenario: Redirige a login si no hay state
    Given the game board is open without state
    Then I should be redirected to login page

  Scenario: Se muestran los dos paneles de jugador
    Given the game board is open in vsBot mode
    Then I should see two player panels

  Scenario: Se muestra el área principal del tablero
    Given the game board is open in vsBot mode
    Then I should see the game main area

  Scenario: Se muestra el footer con la información de la partida
    Given the game board is open in vsBot mode
    Then I should see the game footer with mode info

  Scenario: El header muestra el tamaño del tablero
    Given the game board is open in vsBot mode
    Then the header should display the board size "11"

  Scenario: El header muestra el logo de la aplicación
    Given the game board is open in vsBot mode
    Then the header should display the app logo

  # ── Carga de partida ──────────────────────────────────────────

  Scenario: Se muestra el spinner de carga mientras el juego inicia
    Given the game board is loading
    Then I should see the loading spinner

  Scenario: El tablero aparece una vez cargado el gameId
    Given the game board is open in vsBot mode
    Then I should see the game board

  Scenario: El footer muestra el modo de juego correcto en vsBot
    Given the game board is open in vsBot mode
    Then the footer should contain "vsBot"

  Scenario: El footer muestra el modo de juego correcto en multiplayer
    Given the game board is open in multiplayer mode
    Then the footer should contain "multiplayer"

  # ── Estado del turno ─────────────────────────────────────────

  Scenario: El indicador de turno muestra al jugador activo al inicio
    Given the game board is open in vsBot mode
    Then the turn indicator should be visible

  Scenario: El panel del jugador 1 está activo al inicio (turno j1)
    Given the game board is open in vsBot mode
    Then the player 1 panel should be active

  Scenario: El panel del jugador 2 no está activo al inicio
    Given the game board is open in vsBot mode
    Then the player 2 panel should not be active

  # ── Modo multiplayer ─────────────────────────────────────────

  Scenario: En modo multiplayer se muestra el nombre del jugador 2 personalizado
    Given the game board is open in multiplayer mode
    Then I should see "Jugador 2" as player 2 name

  Scenario: Los puntos iniciales de ambos jugadores son cero
    Given the game board is open in vsBot mode
    Then both players should start with 0 points

  # ── Redirección por falta de autenticación ───────────────────

  Scenario: Redirige al login si la autenticación falla
    Given the game board is open with failed auth
    Then I should be redirected to login page

  # ── Tablero de tamaño pequeño (8×) ───────────────────────────

  Scenario: Se puede abrir el tablero con tamaño 8
    Given the game board is open with board size 8
    Then I should see the game board

  # ── Tablero de tamaño grande (19×) ───────────────────────────

  Scenario: Se puede abrir el tablero con tamaño 19
    Given the game board is open with board size 19
    Then the header should display the board size "19"
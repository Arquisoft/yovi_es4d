package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class GameBoardLoadSimulation extends Simulation {

  private val gatewayUrl = "http://host.docker.internal:8000"

  private val httpProtocol = http
    .baseUrl(gatewayUrl)
    .acceptHeader("application/json, text/plain, */*")
    .contentTypeHeader("application/json")
    .shareConnections // Mantiene la conexión abierta como un navegador real

  // Generador de datos para el "Registro Manual"
  private val userFeeder = (1 to 10).map { i =>
    Map(
      "userEmail"    -> s"manual_test_$i@yovi.com",
      "userPassword" -> "Password123", // Cumple con validatePassword de tu RegisterForm.tsx
      "username"     -> s"JugadorManual$i"
    )
  }.toArray.circular

  val scn = scenario("Flujo Manual Completo")
    .feed(userFeeder)

    // ── PASO 1: REGISTRO (Simulando RegisterForm.tsx) ──
    .exec(http("Navegar a Registro").get("/register").check(status.is(200)))
    .pause(3) // Tiempo que tarda el usuario en escribir nombre, email y pass
    .exec(http("Click Botón Registrarse")
      .post("/adduser")
      .body(StringBody(
        """{
          "username":"#{username}",
          "email":"#{userEmail}",
          "password":"#{userPassword}"
        }"""
      )).asJson
      .check(status.in(201, 409))) // 201 creado o 409 si ya existe
    .pause(2)

    // ── PASO 2: LOGIN (Simulando LoginForm.tsx) ──
    .exec(http("Navegar a Login").get("/login").check(status.is(200)))
    .pause(2) // Tiempo de escribir credenciales
    .exec(http("Click Botón Entrar")
      .post("/login")
      .body(StringBody(
        """{
          "email":"#{userEmail}",
          "password":"#{userPassword}"
        }"""
      )).asJson
      .check(status.is(200))
      .check(jsonPath("$.id").saveAs("userId"))) // Guardamos ID para el juego
    .pause(1)

    // ── PASO 3: SELECCIÓN DE MODO (Simulando ModeSelector.tsx) ──
    .exec(http("Navegar a ModeSelector").get("/select").check(status.is(200)))
    .pause(2) // El usuario elige dificultad y tamaño
    .exec(http("Click Botón Jugar")
      .post("/api/game/start")
      .body(StringBody(
        """{
          "userId":"#{userId}",
          "gameMode":"vsBot",
          "botMode":"random_bot",
          "boardSize":11
        }"""
      )).asJson
      .check(status.is(200))
      .check(jsonPath("$.gameId").saveAs("gameId"))
      .check(jsonPath("$.board[0].position").saveAs("firstMove")))
    .pause(1)

    // ── PASO 4: JUEGO EN TABLERO (Simulando GameBoard.tsx) ──
    .exec(http("Cargar Visual GameBoard").get("/game").check(status.is(200)))
    .pause(1)
    // Simula handleHexClick: Validar y luego Mover
    .exec(http("GameBoard: Validar Hexágono")
      .post("/api/game/#{gameId}/validateMove")
      .body(StringBody("""{"userId":"#{userId}","move":"#{firstMove}"}""")).asJson
      .check(status.is(200)))
    .pause(400.milliseconds)
    .exec(http("GameBoard: Realizar Movimiento")
      .post("/api/game/#{gameId}/move")
      .body(StringBody("""{"userId":"#{userId}","move":"#{firstMove}","mode":"vsBot"}""")).asJson
      .check(status.is(200)))
    .pause(2)

    // ── PASO 5: SALIR ──
    .exec(http("Logout").post("/logout").check(status.is(200)))

  setUp(
    scn.inject(atOnceUsers(1)) // Probamos con 1 usuario para asegurar que el flujo es correcto
  ).protocols(httpProtocol)
}
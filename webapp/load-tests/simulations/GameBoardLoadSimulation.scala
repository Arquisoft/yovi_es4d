package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import java.util.UUID

class GameBoardLoadSimulation extends Simulation {

  private val baseUrl = sys.env.getOrElse("BASE_URL", "http://host.docker.internal:8000")
  private val users = Integer.getInteger("users", 250).toInt
  private val rampSeconds = Integer.getInteger("rampSeconds", 30).toInt
  private val maxDurationSeconds = Integer.getInteger("maxDurationSeconds", 180).toInt
  private val boardSize = Integer.getInteger("boardSize", 11).toInt
  private val gamesPerUser = Integer.getInteger("gamesPerUser", 2).toInt
  private val movesPerGame = Integer.getInteger("movesPerGame", 2).toInt
  private val botMode = sys.env.getOrElse("BOT_MODE", "random_bot")

  private val existingEmail = sys.env.get("LOADTEST_USER_EMAIL").map(_.trim).filter(_.nonEmpty)
  private val existingPassword = sys.env.get("LOADTEST_USER_PASSWORD").map(_.trim).filter(_.nonEmpty)
  private val useExistingUser = existingEmail.isDefined && existingPassword.isDefined

  private val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json, text/plain, */*")
    .contentTypeHeader("application/json")
    .disableCaching
    .shareConnections

  private val userFeeder =
    if (useExistingUser) {
      Iterator.continually(
        Map(
          "userEmail" -> existingEmail.get,
          "userPassword" -> existingPassword.get,
          "username" -> "LoadExistingUser"
        )
      )
    } else {
      Iterator.continually {
        val suffix = UUID.randomUUID().toString.take(8)
        Map(
          "userEmail" -> s"load_${suffix}@yovi.local",
          "userPassword" -> "P@ssw0rd123!",
          "username" -> s"LoadUser_${suffix}"
        )
      }
    }

  val scn = scenario("Register + Login + Start + Play (vsBot)")
    .feed(userFeeder)
    .doIf(_ => !useExistingUser) {
      exec(
        http("POST /adduser (register)")
          .post("/adduser")
          .body(StringBody(
            """{
              "username":"${username}",
              "email":"${userEmail}",
              "password":"${userPassword}"
            }"""
          )).asJson
          .check(status.in(200, 201, 409))
      )
        .exitHereIfFailed
    }
    .pause(200.milliseconds, 800.milliseconds)
    .exec(
      http("POST /login (cookie)")
        .post("/login")
        .body(StringBody(
          """{
            "email":"${userEmail}",
            "password":"${userPassword}"
          }"""
        )).asJson
        .check(status.is(200))
        .check(jsonPath("$.id").saveAs("userId"))
    )
    .exitHereIfFailed
    .pause(200.milliseconds, 800.milliseconds)
    .exec(
      http("GET /api/auth/me")
        .get("/api/auth/me")
        .check(status.is(200))
        .check(jsonPath("$.userId").exists)
    )
    .pause(100.milliseconds, 500.milliseconds)
    .exec(
      http("POST /api/user/getUserProfile")
        .post("/api/user/getUserProfile")
        .body(StringBody("""{}""")).asJson
        .check(status.is(200))
        .check(jsonPath("$.email").exists)
    )
    .pause(100.milliseconds, 600.milliseconds)
    .exec(
      http("GET /api/game/bot-modes")
        .get("/api/game/bot-modes")
        .check(status.is(200))
        .check(jsonPath("$.botModes").exists)
    )
    .pause(200.milliseconds, 900.milliseconds)
    .repeat(gamesPerUser, "gameIdx") {
      exec(
        http("POST /api/game/start ${gameIdx}")
          .post("/api/game/start")
          .body(StringBody(
            s"""{
              "gameMode":"vsBot",
              "botMode":"${botMode}",
              "boardSize":${boardSize}
            }"""
          )).asJson
          .check(status.is(200))
          .check(jsonPath("$.gameId").saveAs("gameId"))
          .check(jsonPath("$.board[*].position").findRandom.saveAs("nextMove"))
      )
      .exitHereIfFailed
      .pause(200.milliseconds, 900.milliseconds)

      .repeat(movesPerGame, "moveIdx") {
        exec(
          http("POST /api/game/${gameId}/validateMove ${gameIdx}-${moveIdx}")
            .post("/api/game/${gameId}/validateMove")
            .body(StringBody("""{"move":"${nextMove}"}""")).asJson
            .check(status.is(200))
        )
        .exitHereIfFailed
        .pause(150.milliseconds, 600.milliseconds)
        .exec(
          http("POST /api/game/${gameId}/move (bot) ${gameIdx}-${moveIdx}")
            .post("/api/game/${gameId}/move")
            .body(StringBody("""{"mode":"vsBot"}""")).asJson
            .check(status.is(200))
            .check(jsonPath("$.status").optional.saveAs("gameStatus"))
            .check(jsonPath("$.winner").optional.saveAs("gameWinner"))
        )
        .exitHereIfFailed
        .pause(150.milliseconds, 700.milliseconds)
        .exec(
          http("GET /api/game/${gameId} (refresh) ${gameIdx}-${moveIdx}")
            .get("/api/game/${gameId}")
            .check(status.is(200))
            .check(jsonPath("$.board[?(@.player==null)].position").findRandom.saveAs("nextMove"))
            .check(jsonPath("$.status").optional.saveAs("gameStatus"))
            .check(jsonPath("$.winner").optional.saveAs("gameWinner"))
        )
        .pause(200.milliseconds, 900.milliseconds)
      }

      // Webapp saves games via `/api/game/:gameId/saveForPlayer` only once the game is finished.
      .doIf(session => session("gameStatus").asOption[String].contains("finished")) {
        exec(
          http("POST /api/game/${gameId}/saveForPlayer ${gameIdx}")
            .post("/api/game/${gameId}/saveForPlayer")
            .body(StringBody(session => {
              val winner =
                session("gameWinner").asOption[String]
                  .filter(w => w != null && w.nonEmpty && w != "null")
                  .getOrElse("draw")
              val userId = session("userId").as[String]
              s"""{"userId":"${userId}","winner":"${winner}"}"""
            })).asJson
            .check(status.is(200))
        )
      }
      .pause(150.milliseconds, 700.milliseconds)
    }
    .exec(
      http("GET /api/game/history")
        .get("/api/game/history")
        .check(status.is(200))
    )
    .exec(http("POST /logout").post("/logout").check(status.is(200)))

  setUp(
    scn.inject(rampUsers(users).during(rampSeconds.seconds))
  ).protocols(httpProtocol)
    .maxDuration(maxDurationSeconds.seconds)
    .assertions(
      global.successfulRequests.percent.gte(98)
    )
}

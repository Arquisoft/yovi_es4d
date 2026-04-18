package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class GameBoardLoadSimulation extends Simulation {

  private val baseUrl = sys.env.getOrElse("BASE_URL", "http://host.docker.internal:8000")
  private val users = Integer.getInteger("users", 5).toInt
  private val rampSeconds = Integer.getInteger("rampSeconds", 30).toInt
  private val maxDurationSeconds = Integer.getInteger("maxDurationSeconds", 180).toInt
  private val gamesPerUser = Integer.getInteger("gamesPerUser", 2).toInt
  private val boardSize = Integer.getInteger("boardSize", 11).toInt
  private val botMode = sys.env.getOrElse("BOT_MODE", "random_bot")
  private val loadUserEmail = "tu_usuario@correo.com"
  private val loadUserPassword = "tu_password"

  if (loadUserEmail.isEmpty || loadUserPassword.isEmpty) {
    throw new IllegalArgumentException(
      "LOADTEST_USER_EMAIL and LOADTEST_USER_PASSWORD are required for GameBoardLoadSimulation."
    )
  }

  private val httpProtocol = http
    .baseUrl(baseUrl)
    .disableCaching
    .acceptHeader("application/json, text/plain, */*")
    .contentTypeHeader("application/json")
    .header("Cache-Control", "no-cache")
    .header("Pragma", "no-cache")
    .userAgentHeader("Gatling GameBoard Load Test")

  private val gameFlow =
    exec(
      http("POST /login")
        .post("/login")
        .body(
          StringBody(
            s"""{"email":"$loadUserEmail","password":"$loadUserPassword"}"""
          )
        ).asJson
        .check(status.is(200))
    )
      .pause(300.milliseconds, 900.milliseconds)
      .exec(
        http("GET /api/auth/me")
          .get("/api/auth/me")
          .check(status.is(200))
          .check(jsonPath("$.userId").exists.saveAs("userId"))
      )
      .pause(150.milliseconds, 600.milliseconds)
      .repeat(gamesPerUser, "gameIndex") {
        exec(
          http("POST /api/user/getUserProfile [#{gameIndex}]")
          .post("/api/user/getUserProfile")
          .check(status.in(200, 404))
        )
        .pause(120.milliseconds, 450.milliseconds)
        .exec(
          http("POST /api/game/start [#{gameIndex}]")
            .post("/api/game/start")
            .body(
              StringBody(
                s"""{"userId":"#{userId}","gameMode":"vsBot","botMode":"$botMode","boardSize":$boardSize}"""
              )
            ).asJson
            .check(status.is(200))
            .check(jsonPath("$.gameId").exists.saveAs("gameId"))
            .check(jsonPath("$.board[0].position").exists.saveAs("firstMove"))
        )
        .pause(120.milliseconds, 450.milliseconds)
        .exec(
          http("GET /api/game/#{gameId} [#{gameIndex}]")
          .get("/api/game/#{gameId}")
          .check(status.is(200))
        )
        .pause(120.milliseconds, 450.milliseconds)
        .exec(
          http("POST /api/game/#{gameId}/validateMove [#{gameIndex}]")
            .post("/api/game/#{gameId}/validateMove")
            .body(
              StringBody("""{"userId":"#{userId}","move":"#{firstMove}"}""")
            ).asJson
            .check(status.is(200))
            .check(jsonPath("$.valid").is("true"))
        )
        .pause(120.milliseconds, 450.milliseconds)
        .exec(
          http("POST /api/game/#{gameId}/move [#{gameIndex}]")
            .post("/api/game/#{gameId}/move")
            .body(
              StringBody("""{"userId":"#{userId}","move":"#{firstMove}","mode":"vsBot"}""")
            ).asJson
            .check(status.is(200))
            .check(jsonPath("$.board").exists)
        )
        .pause(120.milliseconds, 450.milliseconds)
      }
      .exec(
        http("POST /logout")
          .post("/logout")
          .check(status.is(200))
      )

  private val scn = scenario("GameBoard login-auth flow")
    .exitBlockOnFail(gameFlow)

  setUp(
    scn.inject(rampUsers(users).during(rampSeconds.seconds))
  ).protocols(httpProtocol)
    .maxDuration(maxDurationSeconds.seconds)
    .assertions(
      global.responseTime.percentile4.lte(2500),
      global.successfulRequests.percent.gte(99)
    )
}

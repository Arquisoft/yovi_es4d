package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class WebAppSmokeSimulation extends Simulation {

  // In this project the frontend talks to the gateway (default port 8000).
  // Running inside Docker, host.docker.internal points to the host machine.
  private val baseUrl = sys.env.getOrElse("BASE_URL", "http://host.docker.internal:8000")
  private val users = Integer.getInteger("users", 25).toInt
  private val rampSeconds = Integer.getInteger("rampSeconds", 30).toInt
  private val maxDurationSeconds = Integer.getInteger("maxDurationSeconds", 90).toInt

  private val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json, text/plain, */*")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling Load Test")

  private val scn = scenario("Gateway public flow")
    .exec(
      http("GET /health")
        .get("/health")
        .check(status.is(200))
        .check(jsonPath("$.status").exists)
    )
    .pause(500.milliseconds, 1500.milliseconds)
    .exec(
      http("GET /api/game/bot-modes")
        .get("/api/game/bot-modes")
        .check(status.is(200))
    )
    .pause(500.milliseconds, 1500.milliseconds)
    .exec(
      http("GET /api/game/history without auth")
        .get("/api/game/history")
        // Endpoint is protected; expected behavior under anonymous load.
        .check(status.is(401))
    )
    .pause(500.milliseconds, 1500.milliseconds)
    .exec(
      http("GET /api/friends without auth")
        .get("/api/friends")
        // Endpoint is protected; expected behavior under anonymous load.
        .check(status.is(401))
    )
    .exec(
      http("GET /api/auth/me without auth")
        .get("/api/auth/me")
        // Endpoint is protected; expected behavior under anonymous load.
        .check(status.is(401))
    )

  setUp(
    scn.inject(rampUsers(users).during(rampSeconds.seconds))
  ).protocols(httpProtocol)
    .maxDuration(maxDurationSeconds.seconds)
}

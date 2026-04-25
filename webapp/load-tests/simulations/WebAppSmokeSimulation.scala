package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class WebAppSmokeSimulation extends Simulation {

  private val baseUrl = sys.env.getOrElse("BASE_URL", "http://host.docker.internal:8000")
  private val users = Integer.getInteger("users", 10).toInt
  private val rampSeconds = Integer.getInteger("rampSeconds", 10).toInt
  private val maxDurationSeconds = Integer.getInteger("maxDurationSeconds", 60).toInt

  private val httpProtocol = http
    .baseUrl(baseUrl)
    .disableCaching
    .acceptHeader("application/json, text/plain, */*")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling Smoke Test")

  private val scn = scenario("Smoke")
    .exec(
      http("GET /health")
        .get("/health")
        .check(status.is(200))
    )
    .pause(200.milliseconds, 800.milliseconds)
    .exec(
      http("GET /api/game/bot-modes")
        .get("/api/game/bot-modes")
        .check(status.is(200))
        .check(jsonPath("$.botModes").exists)
    )

  setUp(
    scn.inject(rampUsers(users).during(rampSeconds.seconds))
  ).protocols(httpProtocol)
    .maxDuration(maxDurationSeconds.seconds)
    .assertions(
      global.successfulRequests.percent.gte(99)
    )
}

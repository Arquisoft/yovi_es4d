package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class ModeSelectorLoadSimulation extends Simulation {

  private val baseUrl = sys.env.getOrElse("BASE_URL", "http://host.docker.internal:8000")
  private val users = Integer.getInteger("users", 80).toInt
  private val rampSeconds = Integer.getInteger("rampSeconds", 45).toInt
  private val maxDurationSeconds = Integer.getInteger("maxDurationSeconds", 120).toInt
  private val repeatsPerUser = Integer.getInteger("repeatsPerUser", 6).toInt

  private val httpProtocol = http
    .baseUrl(baseUrl)
    .disableCaching
    .acceptHeader("application/json, text/plain, */*")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling ModeSelector Load Test")

  private val scn = scenario("ModeSelector bot modes flow")
    .exec(
      http("GET /health")
        .get("/health")
        .check(status.is(200))
    )
    .pause(200.milliseconds, 700.milliseconds)
    .repeat(repeatsPerUser, "idx") {
      exec(
        http("GET /api/game/bot-modes #{idx}")
          .get("/api/game/bot-modes")
          .check(status.is(200))
          .check(jsonPath("$.botModes").exists)
      ).pause(200.milliseconds, 1200.milliseconds)
    }

  setUp(
    scn.inject(rampUsers(users).during(rampSeconds.seconds))
  ).protocols(httpProtocol)
    .maxDuration(maxDurationSeconds.seconds)
    .assertions(
      global.responseTime.percentile4.lte(1500),
      global.successfulRequests.percent.gte(99)
    )
}

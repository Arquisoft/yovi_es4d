package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import java.util.UUID

class FriendsLoadSimulation extends Simulation {

  private val baseUrl = sys.env.getOrElse("BASE_URL", "http://host.docker.internal:8000")
  private val users = Integer.getInteger("users", 250).toInt
  private val rampSeconds = Integer.getInteger("rampSeconds", 30).toInt
  private val maxDurationSeconds = Integer.getInteger("maxDurationSeconds", 180).toInt

  private val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json, text/plain, */*")
    .contentTypeHeader("application/json")
    .disableCaching
    .shareConnections

  // 🔹 Usuarios dinámicos
  private val userFeeder = Iterator.continually {
    val suffix = UUID.randomUUID().toString.take(8)
    Map(
      "userEmail" -> s"load_${suffix}@yovi.local",
      "userPassword" -> "P@ssw0rd123!",
      "username" -> s"LoadUser_${suffix}"
    )
  }

  val scn = scenario("Full User Journey (Game + Social)")
    .feed(userFeeder)

    // =====================
    // REGISTER
    // =====================
    .exec(
      http("POST /adduser")
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

    .pause(200.milliseconds, 800.milliseconds)

    // =====================
    // LOGIN
    // =====================
    .exec(
      http("POST /login")
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

    // =====================
    // AUTH CHECK
    // =====================
    .exec(
      http("GET /api/auth/me")
        .get("/api/auth/me")
        .check(status.is(200))
    )

    .pause(100.milliseconds, 500.milliseconds)

    // =====================
    // PERFIL
    // =====================
    .exec(
      http("POST /api/user/getUserProfile")
        .post("/api/user/getUserProfile")
        .body(StringBody("""{}""")).asJson
        .check(status.is(200))
    )

    // =====================
    // SOCIAL - BUSCAR USUARIOS
    // =====================
    .exec(
      http("GET /api/friends/explore")
        .get("/api/friends/explore")
        .queryParam("search", "")
        .queryParam("page", "1")
        .check(status.is(200))
        .check(jsonPath("$.users[*]._id").findRandom.optional.saveAs("targetUserId"))
    )

    .pause(100.milliseconds, 600.milliseconds)

    // =====================
    // ENVIAR SOLICITUD (genera notificación)
    // =====================
    .doIf(session => session.contains("targetUserId"))(
      exec(
        http("POST /api/friends/request")
          .post("/api/friends/request")
          .body(StringBody(
            """{
              "receiverId":"${targetUserId}"
            }"""
          )).asJson
          .check(status.in(200, 201, 400))
      )
    )

    .pause(200.milliseconds, 800.milliseconds)

    // =====================
    // VER NOTIFICACIONES
    // =====================
    .exec(
      http("GET /api/notifications")
        .get("/api/notifications")
        .queryParam("page", "1")
        .check(status.is(200))
    )

    // =====================
    // FRIEND REQUESTS (sent) + cancel (best-effort)
    // =====================
    .exec(
      http("GET /api/friends/requests (sent)")
        .get("/api/friends/requests")
        .queryParam("type", "sent")
        .check(status.is(200))
        .check(jsonPath("$[*]._id").findRandom.optional.saveAs("sentRequestId"))
    )

    .doIf(session => session.contains("sentRequestId"))(
      exec(
        http("DELETE /api/friends/request/:id (cancel)")
          .delete("/api/friends/request/${sentRequestId}")
          .check(status.in(200, 404, 400))
      )
    )

    .pause(200.milliseconds, 900.milliseconds) /* MARCAR NOTIFICACIONES COMO LEIDAS */
    .exec(
      http("PATCH /api/notifications/read-all")
        .patch("/api/notifications/read-all")
        .body(StringBody("""{}""")).asJson
        .check(status.is(200))
    )

    .pause(100.milliseconds, 500.milliseconds) /* LISTAR AMIGOS */
    .exec(
      http("GET /api/friends")
        .get("/api/friends")
        .queryParam("search", "")
        .queryParam("page", "1")
        .check(status.is(200))
    )

    /* LOGOUT */
    .exec(
      http("POST /logout")
        .post("/logout")
        .check(status.is(200))
    )

  setUp(
    scn.inject(rampUsers(users).during(rampSeconds.seconds))
  )
    .protocols(httpProtocol)
    .maxDuration(maxDurationSeconds.seconds)
    .assertions(
      global.successfulRequests.percent.gte(98)
    )
}

use actix_web::{web, App, HttpServer, HttpResponse};
use serde::Deserialize;
use serde_json::json;
use gamey::GameY;
use gamey::PlayerId; 
use gamey::core::coord::Coordinates;
use gamey::core::movement::Movement;
use gamey::core::game::GameStatus;
use std::sync::{Arc, Mutex};
mod bot;
use crate::bot::{RandomBot, YBotRegistry, YBot};

/* =========================
   STRUCTS (lo que recibimos)
   ========================= */

#[derive(Debug, Deserialize)]
struct StartGameRequest {
    board_size: u32,
}

#[derive(Debug, Deserialize)]
struct MoveRequest {
    x: i32,
    y: i32,
    z: i32,
    player: u32,
}

#[derive(Debug, Deserialize)]
struct EndGameRequest {
    game_id: String,
}

/* =========================
   ENDPOINTS
   ========================= */

// 🟢 Iniciar juego
async fn start_game(
    req: web::Json<StartGameRequest>,
    state: web::Data<Mutex<Option<GameY>>>
) -> HttpResponse {
    let mut game_lock = state.lock().unwrap();
    *game_lock = Some(GameY::new(req.board_size));

    println!("🟢 [Rust] start_game");
    println!("   Tamaño del tablero: {}", req.board_size);
    println!("   Next player: {:?}", game_lock.as_ref().unwrap().next_player());

    HttpResponse::Ok().json(json!({
        "status": "started",
        "board_size": req.board_size
    }))
}

// 🎯 Movimiento del usuario
pub async fn user_move(
    req: web::Json<MoveRequest>,
    state: web::Data<Mutex<Option<GameY>>>,
) -> HttpResponse {
    use std::convert::TryInto;
    println!("🎯 [Rust] user_move");
    println!("   Movimiento: x={} y={} z={}", req.x, req.y,req.z);
    let mut game_lock = state.lock().unwrap();
    let game = match game_lock.as_mut() {
        Some(g) => g,
        None => return HttpResponse::BadRequest().json(json!({
            "valid": false,
            "message": "El juego no ha sido iniciado"
        })),
    };

    // Verificamos que el juego no haya terminado
    if let GameStatus::Finished { winner } = game.status() {
        return HttpResponse::Ok().json(json!({
            "valid": false,
            "message": "El juego ya terminó",
            "winner": winner.id(),
            "status": "finished"
        }));
    }

    // 📌 DEBUG: turno antes de validar
    println!("🔹 Turno antes de validar: {:?}", game.next_player());

    // Turno del jugador
    let next_player = match game.next_player() {
        Some(p) => p,
        None => return HttpResponse::Ok().json(json!({
            "valid": false,
            "message": "El juego ya terminó",
            "winner": null,
            "status": "finished"
        })),
    };

    // 📌 DEBUG: información del turno
    println!("🔹 Next player: {:?}", next_player);
    println!("🔹 Player intentando mover: {}", req.player);

    if next_player.id() != req.player {
        println!("❌ No es el turno del jugador {}!", req.player);
        return HttpResponse::BadRequest().json(json!({
            "valid": false,
            "message": "No es tu turno"
        }));
    }

    println!("🔵 Movimiento recibido: player={} x={} y={} z={}", req.player, req.x, req.y, req.z);

    // Convertimos coordenadas i32 -> u32
    let coords = match (req.x.try_into(), req.y.try_into(), req.z.try_into()) {
        (Ok(x), Ok(y), Ok(z)) => Coordinates::new(x, y, z),
        _ => return HttpResponse::BadRequest().json(json!({
            "valid": false,
            "message": "Coordenadas inválidas (deben ser >= 0)"
        })),
    };

    let movement = Movement::Placement {
        player: next_player,
        coords,
    };

    // 📌 DEBUG: antes de aplicar movimiento
    println!("🔹 Antes de aplicar movimiento, turno actual: {:?}", game.next_player());

    match game.add_move(movement) {
        Ok(_) => {
            // 📌 DEBUG: después de aplicar movimiento
            println!("✅ Movimiento aplicado para player {}", req.player);
            println!("🔹 Turno después del movimiento: {:?}", game.next_player());
 
            let board = game.board_state().into_iter().map(|(coords, player_id)| {
                json!({
                    "x": coords.x(),
                    "y": coords.y(),
                    "z": coords.z(),
                    "player": player_id,
                })
            }).collect::<Vec<_>>();

            HttpResponse::Ok().json(json!({
                "valid": true,
                "message": "Movimiento registrado",
                "board": board,
                "turn": game.next_player().map(|p| p.id()),
                "status": match game.status() {
                    GameStatus::Ongoing { .. } => "active",
                    GameStatus::Finished { .. } => "finished",
                },
                "winner": match game.status() {
                    GameStatus::Finished { winner } => Some(winner.id()),
                    _ => None,
                }
            }))
        }

        Err(e) => {
            println!("❌ Movimiento inválido: {:?}", e);
            HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": format!("Movimiento inválido: {:?}", e),
            }))
        },
    }
}


// 🔴 Finalizar juego
async fn end_game(req: web::Json<EndGameRequest>) -> web::Json<serde_json::Value> {
    println!("🔴 Probando a finalizar juego");
    println!("   Game ID: {}", req.game_id);

    web::Json(json!({
        "status": "finished"
    }))
}
pub async fn bot_move(
    state: web::Data<Mutex<Option<GameY>>>,
    registry: web::Data<Arc<YBotRegistry>>,
) -> HttpResponse {
    let mut game_lock = state.lock().unwrap();
    let game = match game_lock.as_mut() {
        Some(g) => g,
        None => {
            return HttpResponse::BadRequest().json({
                serde_json::json!({ "valid": false, "message": "El juego no ha sido iniciado" })
            });
        }
    };

    // Revisamos si el juego ya terminó
    if let GameStatus::Finished { winner } = game.status() {
        return HttpResponse::Ok().json({
            serde_json::json!({ "valid": false, "message": "El juego ya terminó", "winner": winner.id() })
        });
    }

    // 1️⃣ Obtenemos el bot desde el registro
    let bot = match registry.find("random_bot") {
        Some(b) => b,
        None => return HttpResponse::InternalServerError().json({
            serde_json::json!({ "valid": false, "message": "Bot no encontrado" })
        }),
    };

    // 2️⃣ Pedimos movimiento al bot
    let bot_move: Coordinates = match bot.choose_move(game) {
        Some(mv) => mv,
        None => return HttpResponse::Ok().json({
            serde_json::json!({ "valid": false, "message": "No hay movimientos disponibles" })
        }),
    };
        println!("🔹 Turno antes de validar: {:?}", game.next_player());

    // Turno del jugador
    let next_player = match game.next_player() {
        Some(p) => p,
        None => return HttpResponse::Ok().json(json!({
            "valid": false,
            "message": "El juego ya terminó",
            "winner": null,
            "status": "finished"
        })),
    };

    // 📌 DEBUG: información del turno
    println!("🔹 Next player: {:?}", next_player);
    println!("🔹 Player intentando mover: bot");

  

    println!("🔵 Movimiento recibido: bot x={} y={} z={}", bot_move.x(), bot_move.y(), bot_move.z());

    let movement = Movement::Placement {
        player: next_player,
        coords: bot_move,
    };

    // 📌 DEBUG: antes de aplicar movimiento
    println!("🔹 Antes de aplicar movimiento, turno actual: {:?}", game.next_player());

    match game.add_move(movement) {
        Ok(_) => {
            // 📌 DEBUG: después de aplicar movimiento
            println!("✅ Movimiento aplicado para player bot");
            println!("🔹 Turno después del movimiento: {:?}", game.next_player());
 
            let board = game.board_state().into_iter().map(|(coords, player_id)| {
                json!({
                    "x": coords.x(),
                    "y": coords.y(),
                    "z": coords.z(),
                    "player": player_id,
                })
            }).collect::<Vec<_>>();

            HttpResponse::Ok().json(json!({
    "valid": true,
    "message": "Movimiento registrado",
    "board": board,
    "turn": game.next_player().map(|p| p.id()), // 0 o 1
    "status": match game.status() {
        GameStatus::Ongoing { .. } => "active",
        GameStatus::Finished { .. } => "finished",
    },
    "winner": match game.status() {
        GameStatus::Finished { winner } => Some(winner.id()),
        _ => None,
    },
    "lastMove": {
        "x": bot_move.x(),
        "y": bot_move.y(),
        "z": bot_move.z()
    }
}))
        }

        Err(e) => {
            println!("❌ Movimiento inválido: {:?}", e);
            HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": format!("Movimiento inválido: {:?}", e),
            }))
        },
    }
}


/* =========================
   MAIN
   ========================= */

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Servidor Rust escuchando en el puerto 3001");

    // Usamos Option<GameY> para inicializar vacío
    let shared_game = web::Data::new(Mutex::new(None::<GameY>));
    let registry = Arc::new(YBotRegistry::new().with_bot(Arc::new(RandomBot)));
    let shared_registry = web::Data::new(registry);

    HttpServer::new(move || {
        App::new()
            .app_data(shared_game.clone())
            .app_data(shared_registry.clone())
            .route("/v1/game/start", web::post().to(start_game))
            .route("/v1/game/move", web::post().to(user_move))
            .route("/v1/game/end", web::post().to(end_game))
            .route("/v1/ybot/choose/random_bot", web::post().to(bot_move))
    })
    .bind("0.0.0.0:3001")?
    .run()
    .await
}

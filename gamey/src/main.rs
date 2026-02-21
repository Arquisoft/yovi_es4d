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
use crate::bot::{RandomBot, IntermediateBot, YBotRegistry, YBot};

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
   HELPERS
   ========================= */

/// Lógica compartida para ejecutar el movimiento de cualquier bot.
/// Recibe el nombre del bot para buscarlo en el registro.
async fn execute_bot_move(
    bot_name: &str,
    state: web::Data<Mutex<Option<GameY>>>,
    registry: web::Data<Arc<YBotRegistry>>,
) -> HttpResponse {
    let mut game_lock = state.lock().unwrap();
    let game = match game_lock.as_mut() {
        Some(g) => g,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": "El juego no ha sido iniciado"
            }));
        }
    };

    // ¿Ya terminó el juego?
    if let GameStatus::Finished { winner } = game.status() {
        return HttpResponse::Ok().json(json!({
            "valid": false,
            "message": "El juego ya terminó",
            "winner": winner.id(),
            "status": "finished"
        }));
    }

    // Buscar el bot en el registro
    let bot = match registry.find(bot_name) {
        Some(b) => b,
        None => {
            return HttpResponse::InternalServerError().json(json!({
                "valid": false,
                "message": format!("Bot '{}' no encontrado en el registro", bot_name)
            }));
        }
    };

    // Pedir movimiento al bot
    let bot_coords: Coordinates = match bot.choose_move(game) {
        Some(mv) => mv,
        None => {
            return HttpResponse::Ok().json(json!({
                "valid": false,
                "message": "No hay movimientos disponibles"
            }));
        }
    };

    // Obtener el jugador cuyo turno es
    let next_player = match game.next_player() {
        Some(p) => p,
        None => {
            return HttpResponse::Ok().json(json!({
                "valid": false,
                "message": "El juego ya terminó",
                "winner": null,
                "status": "finished"
            }));
        }
    };

    println!(
        "🤖 [{}] elige: x={} y={} z={} (player {})",
        bot_name,
        bot_coords.x(),
        bot_coords.y(),
        bot_coords.z(),
        next_player.id()
    );

    let movement = Movement::Placement {
        player: next_player,
        coords: bot_coords,
    };

    match game.add_move(movement) {
        Ok(_) => {
            println!("✅ Movimiento del bot '{}' aplicado", bot_name);

            let board = game
                .board_state()
                .into_iter()
                .map(|(coords, player_id)| {
                    json!({
                        "x": coords.x(),
                        "y": coords.y(),
                        "z": coords.z(),
                        "player": player_id,
                    })
                })
                .collect::<Vec<_>>();

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
                },
                "lastMove": {
                    "x": bot_coords.x(),
                    "y": bot_coords.y(),
                    "z": bot_coords.z()
                }
            }))
        }
        Err(e) => {
            println!("❌ Movimiento inválido del bot: {:?}", e);
            HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": format!("Movimiento inválido: {:?}", e),
            }))
        }
    }
}

/* =========================
   ENDPOINTS
   ========================= */

// 🟢 Iniciar juego
async fn start_game(
    req: web::Json<StartGameRequest>,
    state: web::Data<Mutex<Option<GameY>>>,
) -> HttpResponse {
    let mut game_lock = state.lock().unwrap();
    *game_lock = Some(GameY::new(req.board_size));

    println!("🟢 [Rust] start_game — tamaño: {}", req.board_size);

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

    println!(
        "🎯 [Rust] user_move — player={} x={} y={} z={}",
        req.player, req.x, req.y, req.z
    );

    let mut game_lock = state.lock().unwrap();
    let game = match game_lock.as_mut() {
        Some(g) => g,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": "El juego no ha sido iniciado"
            }));
        }
    };

    // ¿Ya terminó el juego?
    if let GameStatus::Finished { winner } = game.status() {
        return HttpResponse::Ok().json(json!({
            "valid": false,
            "message": "El juego ya terminó",
            "winner": winner.id(),
            "status": "finished"
        }));
    }

    let next_player = match game.next_player() {
        Some(p) => p,
        None => {
            return HttpResponse::Ok().json(json!({
                "valid": false,
                "message": "El juego ya terminó",
                "winner": null,
                "status": "finished"
            }));
        }
    };

    if next_player.id() != req.player {
        println!("❌ No es el turno del jugador {}!", req.player);
        return HttpResponse::BadRequest().json(json!({
            "valid": false,
            "message": "No es tu turno"
        }));
    }

    // Convertir coordenadas i32 → u32
    let coords = match (req.x.try_into(), req.y.try_into(), req.z.try_into()) {
        (Ok(x), Ok(y), Ok(z)) => Coordinates::new(x, y, z),
        _ => {
            return HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": "Coordenadas inválidas (deben ser >= 0)"
            }));
        }
    };

    let movement = Movement::Placement {
        player: next_player,
        coords,
    };

    match game.add_move(movement) {
        Ok(_) => {
            println!("✅ Movimiento aplicado para player {}", req.player);

            let board = game
                .board_state()
                .into_iter()
                .map(|(coords, player_id)| {
                    json!({
                        "x": coords.x(),
                        "y": coords.y(),
                        "z": coords.z(),
                        "player": player_id,
                    })
                })
                .collect::<Vec<_>>();

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
        }
    }
}

// 🔴 Finalizar juego
async fn end_game(req: web::Json<EndGameRequest>) -> web::Json<serde_json::Value> {
    println!("🔴 Finalizando juego — game_id: {}", req.game_id);
    web::Json(json!({ "status": "finished" }))
}

// 🤖 Movimiento del RandomBot
pub async fn bot_move_random(
    state: web::Data<Mutex<Option<GameY>>>,
    registry: web::Data<Arc<YBotRegistry>>,
) -> HttpResponse {
    execute_bot_move("random_bot", state, registry).await
}

// 🧠 Movimiento del IntermediateBot
pub async fn bot_move_intermediate(
    state: web::Data<Mutex<Option<GameY>>>,
    registry: web::Data<Arc<YBotRegistry>>,
) -> HttpResponse {
    execute_bot_move("intermediate_bot", state, registry).await
}

/* =========================
   MAIN
   ========================= */

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("🚀 Servidor Rust escuchando en el puerto 3001");

    let shared_game = web::Data::new(Mutex::new(None::<GameY>));

    let registry = Arc::new(
        YBotRegistry::new()
            .with_bot(Arc::new(RandomBot))
            .with_bot(Arc::new(IntermediateBot)),  // ← nuevo bot registrado
    );
    let shared_registry = web::Data::new(registry);

    HttpServer::new(move || {
        App::new()
            .app_data(shared_game.clone())
            .app_data(shared_registry.clone())
            // Juego
            .route("/v1/game/start",  web::post().to(start_game))
            .route("/v1/game/move",   web::post().to(user_move))
            .route("/v1/game/end",    web::post().to(end_game))
            // Bots
            .route("/v1/ybot/choose/random_bot",       web::post().to(bot_move_random))
            .route("/v1/ybot/choose/intermediate_bot", web::post().to(bot_move_intermediate))
    })
        .bind("0.0.0.0:3001")?
        .run()
        .await
}
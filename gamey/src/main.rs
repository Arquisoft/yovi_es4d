//PRUEBA PARA COMPROABR FUNCIONAR EL BOT DE RUST DESDE NODEJS
// main.rs
use actix_web::{web, App, HttpServer};
use serde::Deserialize;

// 1️⃣ Definir la estructura de los datos que recibirá
#[derive(Debug, Deserialize)]
struct GameState {
    // Pon los campos que quieras probar
    board_size: u32,
}

// 2️⃣ Endpoint que recibe POST y devuelve JSON
async fn random_bot(game: web::Json<GameState>) -> web::Json<serde_json::Value> {
    // Imprime en consola lo que llega desde Node.js
    println!("🚀 Recibí el tablero: {:?}", game);

    // Respuesta de prueba
    web::Json(serde_json::json!({
        "coords": { "x": 0, "y": 0, "z": 0 }
    }))
}

// 3️⃣ Main: levantar servidor en localhost:3001
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("🚀 Servidor Rust escuchando en http://127.0.0.1:3001");

    HttpServer::new(|| {
        App::new()
            .route(
                "/v1/ybot/choose/random_bot", 
                web::post().to(random_bot)
            )
    })
    .bind("127.0.0.1:3001")?
    .run()
    .await
}

use actix_web::{web, App, HttpServer, HttpResponse};
use serde::{Deserialize, Serialize};
use serde_json::json;
use gamey::GameY;
use gamey::PlayerId;
use gamey::YEN;
use gamey::core::coord::Coordinates;
use gamey::core::movement::Movement;
use gamey::core::game::GameStatus;
use std::convert::TryFrom;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
mod bot;
use crate::bot::{RandomBot, IntermediateBot, HardBot, YBotRegistry, YBot};

/* STRUCTS (lo que recibimos)*/

/// Estructura para la solicitud de iniciar un juego.
/// Contiene el tamaño del tablero y el ID del juego.
#[derive(Debug, Deserialize)]
struct StartGameRequest {
    board_size: u32,
    game_id: String,
}

/// Estructura para la solicitud de movimiento.
/// Contiene las coordenadas, el jugador que hace el movimiento y el ID del juego.
#[derive(Debug, Deserialize)]
struct MoveRequest {
    x: i32,
    y: i32,
    z: i32,
    player: u32,
    game_id: String,
}

/// Estructura para la solicitud de finalizar un juego.
/// Contiene el ID del juego.
#[derive(Debug, Deserialize)]
struct EndGameRequest {
    game_id: String,
}

/// Estructura para la solicitud de movimiento del bot.
/// Contiene el ID del juego.
#[derive(Debug, Deserialize)]
struct BotMoveRequest {
    game_id: String,
}

/// Parámetros de la query del endpoint público /play.
/// Permite a bots externos obtener el siguiente movimiento dado un estado en formato YEN.
#[derive(Debug, Deserialize)]
struct PlayQuery {
    /// Estado del tablero en formato YEN (JSON serializado como string).
    position: String,
    /// Identificador del bot a usar. Por defecto: hard_bot.
    bot_id: Option<String>,

#[derive(Debug, Deserialize)]
struct TetraStartRequest {
    size: u32,
}

#[derive(Debug, Deserialize)]
struct TetraMoveRequest {
    a: i32,
    b: i32,
    c: i32,
    d: i32,
    player: u32,
}

#[derive(Debug, Clone, Serialize)]
struct TetraCellResponse {
    a: u32,
    b: u32,
    c: u32,
    d: u32,
    player: Option<u32>,
}

#[derive(Debug, Clone)]
struct TetraGame {
    size: u32,
    cells: HashMap<(u32, u32, u32, u32), u32>,
    next_player: u32,
    winner: Option<u32>,
}

impl TetraGame {
    fn new(size: u32) -> Self {
        Self {
            size: size.max(2),
            cells: HashMap::new(),
            next_player: 0,
            winner: None,
        }
    }

    fn is_valid_coord(&self, coord: (u32, u32, u32, u32)) -> bool {
        coord.0 + coord.1 + coord.2 + coord.3 == self.size.saturating_sub(1)
    }

    fn available_moves(&self) -> Vec<(u32, u32, u32, u32)> {
        let mut moves = Vec::new();
        let total = self.size.saturating_sub(1);
        for a in 0..=total {
            for b in 0..=total - a {
                for c in 0..=total - a - b {
                    let d = total - a - b - c;
                    let coord = (a, b, c, d);
                    if !self.cells.contains_key(&coord) {
                        moves.push(coord);
                    }
                }
            }
        }
        moves
    }

    fn board_response(&self) -> Vec<TetraCellResponse> {
        let mut cells = self
            .available_moves()
            .into_iter()
            .map(|(a, b, c, d)| TetraCellResponse {
                a,
                b,
                c,
                d,
                player: self.cells.get(&(a, b, c, d)).copied(),
            })
            .collect::<Vec<_>>();

        for (coord, player) in &self.cells {
            if !cells.iter().any(|cell| (cell.a, cell.b, cell.c, cell.d) == *coord) {
                cells.push(TetraCellResponse {
                    a: coord.0,
                    b: coord.1,
                    c: coord.2,
                    d: coord.3,
                    player: Some(*player),
                });
            }
        }

        cells.sort_by_key(|cell| (cell.a, cell.b, cell.c, cell.d));
        cells
    }

    fn neighbors(&self, coord: (u32, u32, u32, u32)) -> Vec<(u32, u32, u32, u32)> {
        let mut set = HashSet::new();
        let values = [coord.0, coord.1, coord.2, coord.3];

        for from in 0..4 {
            for to in 0..4 {
                if from == to || values[from] == 0 {
                    continue;
                }

                let mut next = values;
                next[from] -= 1;
                next[to] += 1;
                let next_coord = (next[0], next[1], next[2], next[3]);

                if self.is_valid_coord(next_coord) {
                    set.insert(next_coord);
                }
            }
        }

        set.into_iter().collect()
    }

    fn touched_faces(coord: (u32, u32, u32, u32)) -> [bool; 4] {
        [coord.0 == 0, coord.1 == 0, coord.2 == 0, coord.3 == 0]
    }

    fn component_info(
        &self,
        start: (u32, u32, u32, u32),
        player: u32,
        global_visited: &mut HashSet<(u32, u32, u32, u32)>,
    ) -> TetraComponentInfo {
        let mut stack = vec![start];
        let mut component_nodes = Vec::new();
        let mut faces = [false, false, false, false];

        global_visited.insert(start);

        while let Some(current) = stack.pop() {
            component_nodes.push(current);

            let current_faces = Self::touched_faces(current);
            for idx in 0..4 {
                faces[idx] = faces[idx] || current_faces[idx];
            }

            for neighbor in self.neighbors(current) {
                if global_visited.contains(&neighbor) {
                    continue;
                }

                if self.cells.get(&neighbor) == Some(&player) {
                    global_visited.insert(neighbor);
                    stack.push(neighbor);
                }
            }
        }

        let node_set = component_nodes.iter().copied().collect::<HashSet<_>>();
        let mut has_branch = false;
        let mut path_edges = Vec::new();
        let mut seen_edges = HashSet::new();

        for node in &component_nodes {
            let player_neighbors = self
                .neighbors(*node)
                .into_iter()
                .filter(|neighbor| node_set.contains(neighbor))
                .collect::<Vec<_>>();

            if player_neighbors.len() >= 3 {
                has_branch = true;
            }

            for neighbor in player_neighbors {
                let edge = if node <= &neighbor {
                    (*node, neighbor)
                } else {
                    (neighbor, *node)
                };

                if seen_edges.insert(edge) {
                    path_edges.push(edge);
                }
            }
        }

        TetraComponentInfo {
            nodes: component_nodes,
            faces,
            has_branch,
            path_edges,
        }
    }

    fn best_component_for_player(&self, player: u32) -> TetraComponentInfo {
        let player_cells = self
            .cells
            .iter()
            .filter_map(|(coord, owner)| if *owner == player { Some(*coord) } else { None })
            .collect::<Vec<_>>();

        let mut best_component = TetraComponentInfo::default();
        let mut visited = HashSet::new();

        for start in player_cells {
            if visited.contains(&start) {
                continue;
            }

            let component = self.component_info(start, player, &mut visited);

            if component.is_better_than(&best_component) {
                best_component = component;
            }
        }

        best_component
    }

    fn place(&mut self, coord: (u32, u32, u32, u32), player: u32) -> Result<(), String> {
        if self.winner.is_some() {
            return Err("El juego ya termino".to_string());
        }

        if player != self.next_player {
            return Err("No es tu turno".to_string());
        }

        if !self.is_valid_coord(coord) {
            return Err("Coordenadas invalidas".to_string());
        }

        if self.cells.contains_key(&coord) {
            return Err("Casilla ocupada".to_string());
        }

        self.cells.insert(coord, player);

        let best_component = self.best_component_for_player(player);
        if best_component.faces.iter().all(|value| *value) && best_component.has_branch {
            self.winner = Some(player);
        } else {
            self.next_player = 1 - self.next_player;
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Default)]
struct TetraComponentInfo {
    nodes: Vec<(u32, u32, u32, u32)>,
    faces: [bool; 4],
    has_branch: bool,
    path_edges: Vec<((u32, u32, u32, u32), (u32, u32, u32, u32))>,
}

impl TetraComponentInfo {
    fn face_count(&self) -> usize {
        self.faces.iter().filter(|value| **value).count()
    }

    fn is_better_than(&self, other: &Self) -> bool {
        if self.face_count() != other.face_count() {
            return self.face_count() > other.face_count();
        }

        if self.has_branch != other.has_branch {
            return self.has_branch;
        }

        self.nodes.len() > other.nodes.len()
    }
}

fn faces_to_labels(faces: [bool; 4]) -> Vec<&'static str> {
    let labels = ["A", "B", "C", "D"];
    labels
        .into_iter()
        .enumerate()
        .filter_map(|(idx, label)| if faces[idx] { Some(label) } else { None })
        .collect()
}

fn edges_to_response(
    edges: &[((u32, u32, u32, u32), (u32, u32, u32, u32))],
) -> Vec<serde_json::Value> {
    edges
        .iter()
        .map(|(from, to)| {
            json!({
                "from": {
                    "a": from.0,
                    "b": from.1,
                    "c": from.2,
                    "d": from.3,
                },
                "to": {
                    "a": to.0,
                    "b": to.1,
                    "c": to.2,
                    "d": to.3,
                }
            })
        })
        .collect()
}

fn tetra_status(game: &TetraGame) -> &'static str {
    if game.winner.is_some() { "finished" } else { "active" }
}

fn tetra_response(game: &TetraGame) -> serde_json::Value {
    let component_0 = game.best_component_for_player(0);
    let component_1 = game.best_component_for_player(1);
    json!({
        "valid": true,
        "board": game.board_response(),
        "turn": if game.winner.is_some() { serde_json::Value::Null } else { json!(game.next_player) },
        "status": tetra_status(game),
        "winner": game.winner,
        "connectedFaces": {
            "0": faces_to_labels(component_0.faces),
            "1": faces_to_labels(component_1.faces),
        },
        "connectionEdges": {
            "0": edges_to_response(&component_0.path_edges),
            "1": edges_to_response(&component_1.path_edges),
        },
        "hasBranch": {
            "0": component_0.has_branch,
            "1": component_1.has_branch,
        }
    })
}

fn tetra_pick_move(game: &TetraGame, bot_name: &str) -> Option<(u32, u32, u32, u32)> {
    let available = game.available_moves();
    if available.is_empty() {
        return None;
    }

    if bot_name == "random_bot" {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.subsec_nanos() as usize)
            .unwrap_or(0);
        return available.get(nanos % available.len()).copied();
    }

    let player = game.next_player;
    let mut scored = available
        .into_iter()
        .map(|coord| {
            let mut score = 0i32;
            let faces = TetraGame::touched_faces(coord);
            score += faces.iter().filter(|face| **face).count() as i32 * 8;

            for neighbor in game.neighbors(coord) {
                if game.cells.get(&neighbor) == Some(&player) {
                    score += if bot_name == "hard_bot" { 7 } else { 4 };
                }
            }

            let values = [coord.0, coord.1, coord.2, coord.3];
            let spread = values.iter().filter(|value| **value > 0).count() as i32;
            score += if bot_name == "hard_bot" { spread * 2 } else { spread };

            (coord, score)
        })
        .collect::<Vec<_>>();

    scored.sort_by(|a, b| b.1.cmp(&a.1));
    scored.first().map(|entry| entry.0)
}

/* HELPERS */

/// Lógica compartida para ejecutar el movimiento de cualquier bot.
/// Recibe el nombre del bot para buscarlo en el registro.
///
/// # Parámetros
/// - `bot_name`: Nombre del bot a usar.
/// - `game_id`: ID del juego sobre el que actuar.
/// - `state`: Estado compartido con el mapa de juegos.
/// - `registry`: Registro de bots disponibles.
///
/// # Retorna
/// Una respuesta HTTP con el resultado del movimiento del bot.
async fn execute_bot_move(
    bot_name: &str,
    game_id: &str,
    state: web::Data<Mutex<HashMap<String, GameY>>>,
    registry: web::Data<Arc<YBotRegistry>>,
) -> HttpResponse {
    let mut games = state.lock().unwrap();
    let game = match games.get_mut(game_id) {
        Some(g) => g,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": "El juego no ha sido iniciado"
            }));
        }
    };

    // Verificar si se termino el juego
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
        "[{}] elige: x={} y={} z={} (player {})",
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
            println!("Movimiento del bot '{}' aplicado", bot_name);

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
            println!("Movimiento inválido del bot: {:?}", e);
            HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": format!("Movimiento inválido: {:?}", e),
            }))
        }
    }
}

/* ENDPOINTS */

/// Inicia un nuevo juego con el tamaño de tablero especificado.
///
/// # Parámetros
/// - `req`: Solicitud JSON con el tamaño del tablero y el ID del juego.
/// - `state`: Estado compartido con el mapa de juegos.
///
/// # Retorna
/// Una respuesta HTTP confirmando el inicio del juego.
async fn start_game(
    req: web::Json<StartGameRequest>,
    state: web::Data<Mutex<HashMap<String, GameY>>>,
) -> HttpResponse {
    let mut games = state.lock().unwrap();
    games.insert(req.game_id.clone(), GameY::new(req.board_size));

    println!("[Rust] start_game — game_id: {} tamaño: {}", req.game_id, req.board_size);

    HttpResponse::Ok().json(json!({
        "status": "started",
        "board_size": req.board_size
    }))
}

/// Procesa el movimiento de un usuario en el juego.
///
/// # Parámetros
/// - `req`: Solicitud JSON con las coordenadas, el jugador y el ID del juego.
/// - `state`: Estado compartido con el mapa de juegos.
///
/// # Retorna
/// Una respuesta HTTP con el resultado del movimiento.
pub async fn user_move(
    req: web::Json<MoveRequest>,
    state: web::Data<Mutex<HashMap<String, GameY>>>,
) -> HttpResponse {
    use std::convert::TryInto;

    println!(
        "[Rust] user_move — game_id={} player={} x={} y={} z={}",
        req.game_id, req.player, req.x, req.y, req.z
    );

    let mut games = state.lock().unwrap();
    let game = match games.get_mut(&req.game_id) {
        Some(g) => g,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": "El juego no ha sido iniciado"
            }));
        }
    };

    // Verificar si se termino el juego
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
        println!("No es el turno del jugador {}!", req.player);
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
            println!("Movimiento aplicado para player {}", req.player);

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
            println!("Movimiento inválido: {:?}", e);
            HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": format!("Movimiento inválido: {:?}", e),
            }))
        }
    }
}

/// Finaliza un juego dado su ID y lo elimina del mapa.
///
/// # Parámetros
/// - `req`: Solicitud JSON con el ID del juego.
/// - `state`: Estado compartido con el mapa de juegos.
///
/// # Retorna
/// Una respuesta JSON confirmando la finalización.
async fn end_game(
    req: web::Json<EndGameRequest>,
    state: web::Data<Mutex<HashMap<String, GameY>>>,
) -> web::Json<serde_json::Value> {
    let mut games = state.lock().unwrap();
    games.remove(&req.game_id);
    println!("Finalizando juego — game_id: {}", req.game_id);
    web::Json(json!({ "status": "finished" }))
}

/// Ejecuta el movimiento del bot aleatorio.
///
/// # Parámetros
/// - `req`: Solicitud JSON con el ID del juego.
/// - `state`: Estado compartido con el mapa de juegos.
/// - `registry`: Registro de bots.
///
/// # Retorna
/// Una respuesta HTTP con el movimiento del bot.
pub async fn bot_move_random(
    req: web::Json<BotMoveRequest>,
    state: web::Data<Mutex<HashMap<String, GameY>>>,
    registry: web::Data<Arc<YBotRegistry>>,
) -> HttpResponse {
    execute_bot_move("random_bot", &req.game_id, state, registry).await
}

/// Ejecuta el movimiento del bot intermedio.
///
/// # Parámetros
/// - `req`: Solicitud JSON con el ID del juego.
/// - `state`: Estado compartido con el mapa de juegos.
/// - `registry`: Registro de bots.
///
/// # Retorna
/// Una respuesta HTTP con el movimiento del bot.
pub async fn bot_move_intermediate(
    req: web::Json<BotMoveRequest>,
    state: web::Data<Mutex<HashMap<String, GameY>>>,
    registry: web::Data<Arc<YBotRegistry>>,
) -> HttpResponse {
    execute_bot_move("intermediate_bot", &req.game_id, state, registry).await
}

/// Ejecuta el movimiento del bot difícil.
///
/// # Parámetros
/// - `req`: Solicitud JSON con el ID del juego.
/// - `state`: Estado compartido con el mapa de juegos.
/// - `registry`: Registro de bots.
///
/// # Retorna
/// Una respuesta HTTP con el movimiento del bot.
pub async fn bot_move_hard(
    req: web::Json<BotMoveRequest>,
    state: web::Data<Mutex<HashMap<String, GameY>>>,
    registry: web::Data<Arc<YBotRegistry>>,
) -> HttpResponse {
    execute_bot_move("hard_bot", &req.game_id, state, registry).await
}

/// Endpoint público para que bots externos obtengan el siguiente movimiento.
///
/// Acepta el estado del tablero en formato YEN (parámetro `position`) y devuelve
/// las coordenadas del movimiento elegido por el bot indicado en `bot_id`.
/// No usa el estado compartido del HashMap — construye el juego directamente desde YEN.
///
/// # Parámetros de query
/// - `position`: JSON YEN del estado actual (obligatorio).
/// - `bot_id`: Identificador del bot (`random_bot`, `intermediate_bot`, `hard_bot`). Por defecto `hard_bot`.
///
/// # Respuesta
/// `{"coords":{"x":1,"y":1,"z":0}}` o `{"action":"resign"}` si no hay movimientos.
pub async fn play(
    query: web::Query<PlayQuery>,
    registry: web::Data<Arc<YBotRegistry>>,
) -> HttpResponse {
    let yen: YEN = match serde_json::from_str(&query.position) {
        Ok(y) => y,
        Err(e) => {
            return HttpResponse::BadRequest().json(json!({
                "error": format!("YEN inválido: {}", e)
            }));
        }
    };

    let game = match GameY::try_from(yen) {
        Ok(g) => g,
        Err(e) => {
            return HttpResponse::BadRequest().json(json!({
                "error": format!("Estado de juego inválido: {:?}", e)
            }));
        }
    };

    let bot_name = query.bot_id.as_deref().unwrap_or("hard_bot");
    let bot = match registry.find(bot_name).or_else(|| registry.find("hard_bot")) {
        Some(b) => b,
        None => {
            return HttpResponse::InternalServerError().json(json!({
                "error": "Bot no disponible"
            }));
        }
    };

    match bot.choose_move(&game) {
        Some(coords) => HttpResponse::Ok().json(json!({
            "coords": {
                "x": coords.x(),
                "y": coords.y(),
                "z": coords.z()
            }
        })),
        None => HttpResponse::Ok().json(json!({ "action": "resign" })),
    }
}

async fn start_tetra_game(
    req: web::Json<TetraStartRequest>,
    state: web::Data<Mutex<Option<TetraGame>>>,
) -> HttpResponse {
    let mut game_lock = state.lock().unwrap();
    *game_lock = Some(TetraGame::new(req.size));

    HttpResponse::Ok().json(json!({
        "status": "started",
        "size": req.size.max(2),
    }))
}

async fn tetra_move(
    req: web::Json<TetraMoveRequest>,
    state: web::Data<Mutex<Option<TetraGame>>>,
) -> HttpResponse {
    let mut game_lock = state.lock().unwrap();
    let game = match game_lock.as_mut() {
        Some(game) => game,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": "El juego tetraedrico no ha sido iniciado"
            }));
        }
    };

    let coord = match (
        u32::try_from(req.a),
        u32::try_from(req.b),
        u32::try_from(req.c),
        u32::try_from(req.d),
    ) {
        (Ok(a), Ok(b), Ok(c), Ok(d)) => (a, b, c, d),
        _ => {
            return HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": "Coordenadas invalidas"
            }));
        }
    };

    match game.place(coord, req.player) {
        Ok(_) => HttpResponse::Ok().json(tetra_response(game)),
        Err(message) => HttpResponse::BadRequest().json(json!({
            "valid": false,
            "message": message,
            "status": tetra_status(game),
            "winner": game.winner,
        })),
    }
}

async fn tetra_bot_move(
    bot_name: &str,
    state: web::Data<Mutex<Option<TetraGame>>>,
) -> HttpResponse {
    let mut game_lock = state.lock().unwrap();
    let game = match game_lock.as_mut() {
        Some(game) => game,
        None => {
            return HttpResponse::BadRequest().json(json!({
                "valid": false,
                "message": "El juego tetraedrico no ha sido iniciado"
            }));
        }
    };

    if game.winner.is_some() {
        return HttpResponse::Ok().json(tetra_response(game));
    }

    let coord = match tetra_pick_move(game, bot_name) {
        Some(coord) => coord,
        None => {
            return HttpResponse::Ok().json(json!({
                "valid": false,
                "message": "No hay movimientos disponibles",
                "status": tetra_status(game),
                "winner": game.winner,
            }));
        }
    };

    match game.place(coord, game.next_player) {
        Ok(_) => {
            let component_0 = game.best_component_for_player(0);
            let component_1 = game.best_component_for_player(1);
            HttpResponse::Ok().json(json!({
            "valid": true,
            "board": game.board_response(),
            "turn": if game.winner.is_some() { serde_json::Value::Null } else { json!(game.next_player) },
            "status": tetra_status(game),
            "winner": game.winner,
            "connectedFaces": {
                "0": faces_to_labels(component_0.faces),
                "1": faces_to_labels(component_1.faces),
            },
            "connectionEdges": {
                "0": edges_to_response(&component_0.path_edges),
                "1": edges_to_response(&component_1.path_edges),
            },
            "hasBranch": {
                "0": component_0.has_branch,
                "1": component_1.has_branch,
            },
            "lastMove": {
                "a": coord.0,
                "b": coord.1,
                "c": coord.2,
                "d": coord.3,
            }
        }))
        },
        Err(message) => HttpResponse::BadRequest().json(json!({
            "valid": false,
            "message": message,
            "status": tetra_status(game),
            "winner": game.winner,
        })),
    }
}

async fn tetra_bot_move_random(
    state: web::Data<Mutex<Option<TetraGame>>>,
) -> HttpResponse {
    tetra_bot_move("random_bot", state).await
}

async fn tetra_bot_move_intermediate(
    state: web::Data<Mutex<Option<TetraGame>>>,
) -> HttpResponse {
    tetra_bot_move("intermediate_bot", state).await
}

async fn tetra_bot_move_hard(
    state: web::Data<Mutex<Option<TetraGame>>>,
) -> HttpResponse {
    tetra_bot_move("hard_bot", state).await
}

/* MAIN */

/// Función principal que inicia el servidor web.
/// Configura el estado compartido del juego (mapa de partidas) y el registro de bots,
/// luego inicia el servidor HTTP en el puerto 4000.
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Servidor Rust escuchando en el puerto 4000");

    let shared_games = web::Data::new(Mutex::new(HashMap::<String, GameY>::new()));
    let shared_tetra_game = web::Data::new(Mutex::new(None::<TetraGame>));


    let registry = Arc::new(
        YBotRegistry::new()
            .with_bot(Arc::new(RandomBot))
            .with_bot(Arc::new(IntermediateBot))
            .with_bot(Arc::new(HardBot)),
    );
    let shared_registry = web::Data::new(registry);

    HttpServer::new(move || {
        App::new()
            .app_data(shared_games.clone())
            .app_data(shared_tetra_game.clone())

            .app_data(shared_registry.clone())
            // Juego
            .route("/v1/game/start",  web::post().to(start_game))
            .route("/v1/game/move",   web::post().to(user_move))
            .route("/v1/game/end",    web::post().to(end_game))
            // Juego tetraedrico
            .route("/v1/tetra/start", web::post().to(start_tetra_game))
            .route("/v1/tetra/move", web::post().to(tetra_move))
            .route("/v1/tetra/bot/random_bot", web::post().to(tetra_bot_move_random))
            .route("/v1/tetra/bot/intermediate_bot", web::post().to(tetra_bot_move_intermediate))
            .route("/v1/tetra/bot/hard_bot", web::post().to(tetra_bot_move_hard))
            // Bots
            .route("/v1/ybot/choose/random_bot",       web::post().to(bot_move_random))
            .route("/v1/ybot/choose/intermediate_bot", web::post().to(bot_move_intermediate))
            .route("/v1/ybot/choose/hard_bot", web::post().to(bot_move_hard))
            // API pública para competición entre bots
            .route("/play", web::get().to(play))
    })
        .bind("0.0.0.0:4000")?
        .run()
        .await
}

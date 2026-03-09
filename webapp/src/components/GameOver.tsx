import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Triangle from "./game/Triangle";
import "./GameOver.css";

const GameOver: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const gameState = location.state as any;

    // ── Sin estado ───────────────────────────────────────────
    if (!gameState) {
        return (
            <div className="go-empty">
                <span style={{ fontSize: "2rem" }}>◈</span>
                <p>No hay partida disponible</p>
                <button className="go-btn-primary" onClick={() => navigate("/")}>
                    Volver al inicio
                </button>
            </div>
        );
    }

    const player1   = gameState.players[0];
    const player2   = gameState.players[1];
    const winnerId  = gameState.winner; // "j1" | "j2"
    const winnerP   = winnerId === "j1" ? player1 : player2;
    const isJ2Win   = winnerId === "j2";

    return (
        <div className="go-container">

            {/* Trofeo */}
            <div className="go-trophy">🏆</div>

            {/* Badge */}
            <div className="go-badge">
                <span>Partida finalizada</span>
            </div>

            {/* Título */}
            <h1 className={`go-title${isJ2Win ? " winner-j2" : ""}`}>
                <span className="go-winner-name">{winnerP?.name ?? "Ganador"}</span>
                {" "}ha ganado
            </h1>
            <p className="go-subtitle">
                Puntuación final · tablero {gameState.hexData?.length ? "completado" : ""}
            </p>

            {/* Contenido */}
            <div className="go-content">

                {/* Jugadores */}
                <div className="go-players">
                    {[player1, player2].map((player, idx) => {
                        const isWinner  = (idx === 0 && winnerId === "j1") || (idx === 1 && winnerId === "j2");
                        const isCoralW  = isWinner && idx === 1;
                        return (
                            <div
                                key={player.id}
                                className={`go-player-card${isWinner ? ` winner-card${isCoralW ? " coral-winner" : ""}` : ""}`}
                            >
                                {isWinner && <span className="go-winner-crown">👑</span>}

                                <div className="go-player-avatar">
                                    <img src="logo.png" alt={player.name} />
                                </div>

                                <span className="go-player-name">{player.name}</span>

                                <div>
                                    <div className="go-score-label">Score</div>
                                    <div className="go-score">{String(player.points).padStart(4, "0")}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tablero de solo lectura */}
                <div className="go-board">
                    <Triangle
                        hexData={gameState.hexData}
                        onHexClick={() => {}}
                        scale={0.75}
                    />
                </div>

            </div>

            {/* Acciones */}
            <div className="go-actions">
                <button className="go-btn-primary" onClick={() => navigate("/select")}>
                    Nueva partida
                </button>
                <button className="go-btn-secondary" onClick={() => navigate("/")}>
                    Inicio
                </button>
            </div>

            {/* Decoración */}
            <div className="go-decoration">
                <div className="go-decoration-line" />
                <span className="go-decoration-text">YOVI</span>
                <div className="go-decoration-line" />
            </div>

        </div>
    );
};

export default GameOver;
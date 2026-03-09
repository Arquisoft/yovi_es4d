import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Triangle from "./Triangle";
import Jugador from "./player";
import { API_URL } from "../../config";
import "./game.css";

interface HexData {
  position: string;
  player: "j1" | "j2" | null;
}

interface PlayerData {
  id: string;
  name: string;
  points: number;
}

interface GameState {
  gameId: string | null;
  hexData: HexData[];
  players: PlayerData[];
  turn: "j1" | "j2" | null;
  status: "active" | "finished" | null;
  winner: "j1" | "j2" | null;
  botPlaying: boolean;
}

interface LocationState {
  gameMode?:  string;
  botMode?:   string;
  boardSize?: number;
}

const GameBoard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    gameMode  = "vsBot",
    botMode   = "random_bot",
    boardSize = 11,
  } = (location.state as LocationState) ?? {};




  const [gameState, setGameState] = useState<GameState>({
    gameId: null,
    hexData: [],
    players: [],
    turn: null,
    status: null,
    winner: null,
    botPlaying: false,
  });

  useEffect(() => {
    if (gameState.status === "finished") {
      navigate("/gameover", { state: gameState });
    }
  }, [gameState.status, navigate]);

  useEffect(() => {
    const startGame = async () => {
      try {
        const res = await fetch(`${API_URL}/api/game/start`, {
          method: "POST",
          credentials: 'include',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "jugador1", gameMode, botMode, boardSize }),
        });
        const data = await res.json();

        if (!res.ok || !data.players) {
          console.error("Error en respuesta de start:", data);
          return;
        }

        setGameState({
          gameId:     data.gameId,
          hexData:    data.board,
          players:    data.players.map((p: PlayerData) => ({ ...p, points: 0 })),
          turn:       data.turn   || "j1",
          status:     data.status || "active",
          winner:     data.winner || null,
          botPlaying: false,
        });
      } catch (error) {
        console.error("Error starting game:", error);
      }
    };
    startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHexClick = async (position: string) => {
    if (!gameState.gameId || gameState.botPlaying || gameState.turn !== "j1" || gameState.status === "finished") return;

    setGameState(prev => ({ ...prev, botPlaying: true }));

    try {
      const validateRes = await fetch(
          `${API_URL}/api/game/${gameState.gameId}/validateMove`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: "j1", move: position }),
          }
      );
      const validateData = await validateRes.json();

      if (!validateRes.ok || !validateData.valid) {
        alert(validateData.error || "Movimiento inválido");
        setGameState(prev => ({ ...prev, botPlaying: false }));
        return;
      }

      setGameState(prev => ({
        ...prev,
        hexData: prev.hexData.map(h => h.position === position ? { ...h, player: "j1" } : h),
        players: prev.players.map(p => p.id === prev.players[0].id ? { ...p, points: p.points + 5 } : p),
        winner:  validateData.winner || prev.winner,
        status:  validateData.status || prev.status,
      }));

      const moveRes = await fetch(`${API_URL}/api/game/${gameState.gameId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "j1", move: position, mode: gameMode }),
      });
      const moveData = await moveRes.json();

      setGameState(prev => ({
        ...prev,
        hexData: moveData.board,
        turn:    moveData.turn,
        winner:  moveData.winner,
        status:  moveData.status,
        players: prev.players.map(p =>
            p.id === "bot" && moveData.turn === "j1" ? { ...p, points: p.points + 5 } : p
        ),
        botPlaying: false,
      }));
    } catch (error) {
      console.error("Error during move:", error);
      setGameState(prev => ({ ...prev, botPlaying: false }));
    }
  };

  const player1 = gameState.players[0] || { id: "jugador1", name: "Jugador", points: 0 };
  const player2 = gameState.players[1] || { id: "bot",      name: "Bot",     points: 0 };

  return (
      <div className="game-bg min-h-screen flex flex-col">

        {/* ── Header ─────────────────────────────────────── */}
        <header className="gb-header">
          <span className="gb-header-logo">YOVI</span>

          <div className="gb-header-status">
            {gameState.status === "finished" ? (
                <span className="gb-status-winner">
              🏆 {gameState.winner === "j1" ? player1.name : player2.name} gana
            </span>
            ) : gameState.botPlaying ? (
                <span className="gb-status-thinking">
              <span>Bot pensando</span>
              <span className="gb-thinking-dots">
                {[0,1,2].map(i => <span key={i} className="thinking-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--coral)", display: "inline-block" }} />)}
              </span>
            </span>
            ) : (
                <span className="gb-status-turn">
              Turno:{" "}
                  <span className={gameState.turn === "j1" ? "gb-turn-j1" : "gb-turn-j2"}>
                {gameState.turn === "j1" ? player1.name : player2.name}
              </span>
            </span>
            )}
          </div>

          <span className="gb-header-meta">
          {boardSize}× · #{gameState.gameId?.slice(-6) ?? "------"}
        </span>
        </header>

        {/* ── Área principal ─────────────────────────────── */}
        <main className="gb-main">

          <aside className="gb-player-aside">
            <Jugador
                name={player1.name}
                imgSrc="logo.png"
                points={player1.points}
                isActive={gameState.turn === "j1" && !gameState.botPlaying}
                color="violet"
            />
          </aside>

          <section className="gb-board-section">
            {gameState.gameId ? (
                <Triangle hexData={gameState.hexData} onHexClick={handleHexClick} scale={0.85} />
            ) : (
                <div className="gb-loading">
                  <div className="gb-loading-dots">
                    {[0,1,2].map(i => (
                        <span key={i} className="thinking-dot" style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(124,111,247,0.3)", display: "inline-block" }} />
                    ))}
                  </div>
                  <span className="gb-loading-text">Iniciando partida</span>
                </div>
            )}
          </section>

          <aside className="gb-player-aside">
            <Jugador
                name={player2.name}
                imgSrc="logo.png"
                points={player2.points}
                isActive={gameState.turn === "j2" && !gameState.botPlaying}
                isPlaying={gameState.botPlaying}
                color="coral"
            />
          </aside>

        </main>

        {/* ── Footer ─────────────────────────────────────── */}
        <footer className="gb-footer">
        <span className="gb-footer-text">
          {botMode.replace("_", " ")} · tablero {boardSize}× · {gameMode}
        </span>
        </footer>
      </div>
  );
};

export default GameBoard;
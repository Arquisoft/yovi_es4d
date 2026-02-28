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
  gameMode?: string;
  botMode?: string;
}

const GameBoard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { gameMode = "vsBot", botMode = "random_bot" } =
  (location.state as LocationState) ?? {};

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "jugador1", gameMode, botMode }),
        });
        const data = await res.json();

        if (!res.ok || !data.players) {
          console.error("Error en respuesta de start:", data);
          return;
        }

        setGameState({
          gameId: data.gameId,
          hexData: data.board,
          players: data.players.map((p: PlayerData) => ({ ...p, points: 0 })),
          turn: data.turn || "j1",
          status: data.status || "active",
          winner: data.winner || null,
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
        winner: validateData.winner || prev.winner,
        status: validateData.status || prev.status,
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
        turn: moveData.turn,
        winner: moveData.winner,
        status: moveData.status,
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
      <div
          className="game-bg min-h-screen flex flex-col"
          style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {/* ── Header ────────────────────────────────────────── */}
        <header className="w-full bg-white/70 backdrop-blur border-b border-[#e8e2d9] px-8 py-3 flex items-center justify-between">
          <span className="text-xs font-mono tracking-[0.4em] uppercase text-[#c4bdb4]">YOVI</span>

          {/* Estado del turno */}
          <div className="flex items-center gap-2 text-sm">
            {gameState.status === "finished" ? (
                <span className="font-semibold text-[#7c6ff7]">
              🏆 {gameState.winner === "j1" ? player1.name : player2.name} gana
            </span>
            ) : gameState.botPlaying ? (
                <span className="flex items-center gap-2 text-[#9e9890]">
              <span className="text-xs tracking-wide">Bot pensando</span>
              <span className="flex gap-1">
                {[0,1,2].map(i => <span key={i} className="thinking-dot w-1.5 h-1.5 rounded-full bg-[#f97058]" />)}
              </span>
            </span>
            ) : (
                <span className="text-[#9e9890] text-xs tracking-wide">
              Turno:{" "}
                  <span className={`font-semibold ${gameState.turn === "j1" ? "text-[#7c6ff7]" : "text-[#f97058]"}`}>
                {gameState.turn === "j1" ? player1.name : player2.name}
              </span>
            </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-[#d6cfc4] tracking-widest">
          #{gameState.gameId?.slice(-6) ?? "------"}
        </span>
        </header>

        {/* ── Área principal ────────────────────────────────── */}
        <main className="flex flex-1 items-center justify-between px-8 py-6 gap-6">

          {/* Jugador 1 */}
          <aside className="w-36 shrink-0">
            <Jugador
                name={player1.name}
                imgSrc="logo.png"
                points={player1.points}
                isActive={gameState.turn === "j1" && !gameState.botPlaying}
                color="violet"
            />
          </aside>

          {/* Tablero */}
          <section className="flex-1 flex items-center justify-center">
            {gameState.gameId ? (
                <Triangle hexData={gameState.hexData} onHexClick={handleHexClick} scale={0.85} />
            ) : (
                <div className="flex flex-col items-center gap-4 text-[#c4bdb4]">
                  <div className="flex gap-2">
                    {[0,1,2].map(i => <span key={i} className="thinking-dot w-2.5 h-2.5 rounded-full bg-[#7c6ff7]/40" />)}
                  </div>
                  <span className="text-xs font-mono tracking-[0.3em] uppercase">Iniciando partida</span>
                </div>
            )}
          </section>

          {/* Bot */}
          <aside className="w-36 shrink-0">
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

        {/* ── Footer ────────────────────────────────────────── */}
        <footer className="w-full border-t border-[#e8e2d9] bg-white/50 py-2.5 flex justify-center">
        <span className="text-[10px] font-mono text-[#c4bdb4] tracking-widest uppercase">
          {botMode.replace("_", " ")} · {gameMode}
        </span>
        </footer>
      </div>
  );
};

export default GameBoard;
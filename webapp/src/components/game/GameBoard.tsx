import React, { useState, useEffect } from "react";
import Triangle from "./Triangle.tsx";
import Jugador from "./player";
import "./GameBoard.css";
import { API_URL } from "../../config.ts";

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
}

const GameBoard: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    gameId: null,
    hexData: [],
    players: [],
    turn: null,
    status: null,
    winner: null
  });

  // Inicia juego
  useEffect(() => {
    const startGame = async () => {
      const res = await fetch(`${API_URL}/api/game/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "jugador1" }),
      });
      const data = await res.json();
      setGameState({
        gameId: data.gameId,
        hexData: data.board,
        players: data.players,
        turn: data.turn || "j1",
        status: data.status || "active",
        winner: data.winner || null
      });
    };
    startGame();
  }, []);

  // Maneja click de usuario
  const handleHexClick = async (position: string) => {
    if (!gameState.gameId || gameState.turn !== "j1") return; // Solo permite movimiento del jugador en su turno

    const res = await fetch(`${API_URL}/api/game/${gameState.gameId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "jugador1", move: position }),
    });
    const data = await res.json();

    setGameState({
      gameId: data.gameId,
      hexData: data.board,
      players: data.players,
      turn: data.turn || "j1",
      status: data.status || "active",
      winner: data.winner || null
    });
  };

  return (
    <div className="gameboard-container">
      {/* Información del turno */}
      <div className="turn-info">
        <h2>
          {gameState.status === "finished" ? (
            <>
              🏆 ¡Juego Terminado! Ganador: {gameState.winner === "j1" ? "Jugador" : "Bot"}
            </>
          ) : (
            <>
              Turno: {gameState.turn === "j1" ? "👤 Jugador" : "🤖 Bot"}
            </>
          )}
        </h2>
      </div>

      <div className="player1">
        {gameState.players[0] && (
          <Jugador
            name={gameState.players[0].name}
            imgSrc="logo.png"
            points={gameState.players[0].points}
            isActive={gameState.turn === "j1"}
          />
        )}
      </div>

      <div className="player2">
        {gameState.players[1] && (
          <Jugador
            name={gameState.players[1].name}
            imgSrc="logo.png"
            points={gameState.players[1].points}
            isActive={gameState.turn === "j2"}
          />
        )}
      </div>

      <Triangle hexData={gameState.hexData} onHexClick={handleHexClick} />

      <div className="board-buttons">
        <button className="undo">Undo</button>
        <button className="redo">Redo</button>
      </div>
    </div>
  );
};

export default GameBoard;

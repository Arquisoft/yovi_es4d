import React, { useState, useEffect } from "react";
import Triangle from "./Triangle";
import Jugador from "./player";
import "./GameBoard.css";
import { API_URL } from "../config.ts";

interface HexData {
  position: string;
  player: "j1" | "j2" | null;
}

interface PlayerData {
  id: string;
  name: string;
  points: number;
}

const GameBoard: React.FC = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [hexData, setHexData] = useState<HexData[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);

  // Inicia juego
  useEffect(() => {
    const startGame = async () => {
      const res = await fetch(`${API_URL}/api/game/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "jugador1" }),
      });
      const data = await res.json();
      setGameId(data.gameId);
      setHexData(data.board);
      setPlayers(data.players);
    };
    startGame();
  }, []);

  // Maneja click de usuario
  const handleHexClick = async (position: string) => {
    if (!gameId) return;

    const res = await fetch(`${API_URL}/api/game/${gameId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "jugador1", move: position }),
    });
    const data = await res.json();

    setHexData(data.board);
    setPlayers(data.players);
  };

  return (
    <div className="gameboard-container">
      <div className="player1">
        {players[0] && (
          <Jugador
            name={players[0].name}
            imgSrc="logo.png"
            points={players[0].points}
            isActive={true}
          />
        )}
      </div>

      <div className="player2">
        {players[1] && (
          <Jugador
            name={players[1].name}
            imgSrc="logo.png"
            points={players[1].points}
            isActive={false}
          />
        )}
      </div>

      <Triangle hexData={hexData} onHexClick={handleHexClick} />

      <div className="board-buttons">
        <button className="undo">Undo</button>
        <button className="redo">Redo</button>
      </div>
    </div>
  );
};

export default GameBoard;

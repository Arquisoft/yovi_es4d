import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Triangle from "./Triangle";
import Jugador from "./player";
import "./GameBoard.css";
import { API_URL } from "../../config";

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

const GameBoard: React.FC = () => {
  
  const navigate = useNavigate(); // ✅ aquí, dentro del componente, fuera de useEffect
    const [gameState, setGameState] = useState<GameState>({
    gameId: null,
    hexData: [],
    players: [],
    turn: null,
    status: null,
    winner: null,
    botPlaying: false
  });

  // Inicia juego
  useEffect(() => {
     if (gameState.status === "finished") {
      
    navigate("/gameover", { state: gameState });
  }
    const startGame = async () => {
      try {
        const res = await fetch(`${API_URL}/api/game/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "jugador1", gameMode: "vsBot" }),
        });
        const data = await res.json();
        setGameState({
          gameId: data.gameId,
          hexData: data.board,
          players: data.players.map((p: PlayerData) => ({ ...p, points: 0 })), // Reiniciamos puntos
          turn: data.turn || "j1",
          status: data.status || "active",
          winner: data.winner || null,
          botPlaying: false
        });
      } catch (error) {
        console.error("Error starting game:", error);
      }
    };
    startGame();
  }, [gameState.status, navigate]);

  const handleHexClick = async (position: string) => {
    if (!gameState.gameId || gameState.botPlaying || gameState.turn !== "j1" || gameState.status === "finished") return;

    // Bloqueamos el tablero inmediatamente
    setGameState(prev => ({ ...prev, botPlaying: true }));

    try {
      // 1️⃣ Validamos el movimiento del usuario
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

      // 2️⃣ Pintamos la jugada del usuario y sumamos 5 puntos
      setGameState(prev => ({
        ...prev,
        hexData: prev.hexData.map(h =>
          h.position === position ? { ...h, player: "j1" } : h
        ),
         players: prev.players.map(p =>
    p.id === prev.players[0].id ? { ...p, points: p.points + 5 } : p
  ),
  winner: validateData.winner || prev.winner,
  status: validateData.status || prev.status
      }));

      // 3️⃣ Llamamos al endpoint /move para registrar el movimiento y mover al bot
      const moveRes = await fetch(`${API_URL}/api/game/${gameState.gameId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "j1", move: position, mode: "vsBot" }),
      });
      const moveData = await moveRes.json();

      // 4️⃣ Actualizamos el tablero con la jugada del bot y sumamos puntos
      setGameState(prev => {
        let updatedPlayers = [...prev.players];

        // Sumamos 5 puntos por la jugada del bot
        updatedPlayers = updatedPlayers.map(p =>
          p.id === "bot" && moveData.turn === "j1" ? { ...p, points: p.points + 5 } : p
        );

        // Si hay ganador, sumamos 100 puntos
        
        return {
          ...prev,
          hexData: moveData.board,
          turn: moveData.turn,
          winner: moveData.winner,
          status: moveData.status,
          players: updatedPlayers,
          botPlaying: false
        };
      });
    } catch (error) {
      console.error("Error during move:", error);
      setGameState(prev => ({ ...prev, botPlaying: false }));
    }
  };

  const player1 = gameState.players[0] || { id: "jugador1", name: "Jugador", points: 0 };
  const player2 = gameState.players[1] || { id: "bot", name: "Bot", points: 0 };

  return (
    <div className="gameboard-container">
      <div className="turn-info">
        <h2>
          {gameState.status === "finished" ? (
            <>🏆 ¡Juego Terminado! Ganador: {gameState.winner === "j1" ? player1.name : player2.name}</>
          ) : gameState.botPlaying ? (
            <>🤖 Bot está jugando...</>
          ) : (
            <>Turno: {gameState.turn === "j1" ? player1.name : player2.name}</>
          )}
        </h2>
      </div>

      <div className="player1">
        <Jugador
          name={player1.name}
          imgSrc="logo.png"
          points={player1.points}
          isActive={gameState.turn === "j1" && !gameState.botPlaying}
        />
      </div>

      <div className="player2">
        <Jugador
          name={player2.name}
          imgSrc="logo.png"
          points={player2.points}
          isActive={gameState.turn === "j2" && !gameState.botPlaying}
          isPlaying={gameState.botPlaying && gameState.turn === "j2"}
        />
      </div>

      <Triangle hexData={gameState.hexData} onHexClick={handleHexClick} />
    </div>
  );
};

export default GameBoard;

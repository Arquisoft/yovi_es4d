import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Triangle from "./Triangle";
import Jugador from "./player";
import "./GameBoard.css";
import { API_URL } from "../../config";
import { useTranslation } from "../../i18n";

interface HexData {
  position: string;
  player: "j1" | "j2" | null;
}

interface PlayerData {
  id: string;      // userId real
  name: string;
  points: number;
  role: "j1" | "j2";
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
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameState>({
    gameId: null,
    hexData: [],
    players: [],
    turn: null,
    status: null,
    winner: null,
    botPlaying: false
  });

  const { t } = useTranslation();

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
          body: JSON.stringify({ userId: "usuario_real", gameMode: "vsBot" }), // userId real
        });
        const data = await res.json();

        setGameState({
          gameId: data.gameId,
          hexData: data.board,
          players: data.players.map((p: PlayerData, i: number) => ({
            ...p,
            points: 0,
            role: i === 0 ? "j1" : "j2"  // asignamos roles
          })),
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
    const currentPlayer = gameState.players.find(p => p.role === gameState.turn);
    if (!gameState.gameId || gameState.botPlaying || !currentPlayer || gameState.status === "finished") return;

    setGameState(prev => ({ ...prev, botPlaying: true }));

    try {
      // 1️⃣ Validar movimiento
      const validateRes = await fetch(
        `${API_URL}/api/game/${gameState.gameId}/validateMove`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentPlayer.id, role: currentPlayer.role, move: position }),
        }
      );
      const validateData = await validateRes.json();

      if (!validateRes.ok || !validateData.valid) {
        alert(validateData.error || "Movimiento inválido");
        setGameState(prev => ({ ...prev, botPlaying: false }));
        return;
      }

      // 2️⃣ Actualizar tablero usuario
      setGameState(prev => ({
        ...prev,
        hexData: prev.hexData.map(h =>
          h.position === position ? { ...h, player: currentPlayer.role } : h
        ),
        players: prev.players.map(p =>
          p.id === currentPlayer.id ? { ...p, points: p.points + 5 } : p
        ),
        winner: validateData.winner || prev.winner,
        status: validateData.status || prev.status
      }));

      // 3️⃣ Enviar movimiento y mover bot
      const moveRes = await fetch(`${API_URL}/api/game/${gameState.gameId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentPlayer.id, role: currentPlayer.role, move: position, mode: "vsBot" }),
      });
      const moveData = await moveRes.json();

      // 4️⃣ Actualizar tablero con jugada del bot
      setGameState(prev => {
        let updatedPlayers = [...prev.players];

        // sumamos 5 puntos al bot si es su turno
        updatedPlayers = updatedPlayers.map(p =>
          p.role === "j2" && moveData.turn === "j1" ? { ...p, points: p.points + 5 } : p
        );

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

  const player1 = gameState.players.find(p => p.role === "j1") || { id: "usuario_real", name: "Jugador", points: 0, role: "j1" };
  const player2 = gameState.players.find(p => p.role === "j2") || { id: "bot", name: "Bot", points: 0, role: "j2" };

  return (
    <div className="gameboard-container">
      <div className="turn-info">
        <h2>
          {gameState.status === "finished" ? (
            <>🏆 {t("gameBoard.endGame")} {gameState.winner === "j1" ? player1.name : player2.name}</>
          ) : gameState.botPlaying ? (
            <>🤖 {t("gameBoard.botPlaying")}</>
          ) : (
            <>🏆 {t("gameBoard.turn")}: {gameState.turn === "j1" ? player1.name : player2.name}</>
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
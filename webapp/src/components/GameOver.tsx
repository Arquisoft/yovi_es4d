import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Triangle from "./game/Triangle";
import Jugador from "./game/player";
import "./GameOver.css";
import { useTranslation } from "../i18n";

const GameOver: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const gameState = location.state as any;
  const { t }  = useTranslation();

  if (!gameState) {
    return (
      <div className="gameover-container">
        <h2>{t("gameOver.noGame")}</h2>
        <button onClick={() => navigate("/")}>{t("gameOver.goHome")}</button>
      </div>
    );
  }

  const player1 = gameState.players[0];
  const player2 = gameState.players[1];

  return (
    <div className="gameover-container">
      {/* Título */}
      <h1 className="gameover-title">
        🏆 {gameState.winner === "j1" ? player1.name : player2.name} {t("gameOver.hasWon")}!
      </h1>

      {/* Contenido principal: jugadores a la izquierda, tablero a la derecha */}
      <div className="gameover-content">
        {/* Panel de jugadores */}
        <div className="gameover-players">
          <Jugador name={player1.name} imgSrc="logo.png" points={player1.points} />
          <Jugador name={player2.name} imgSrc="logo.png" points={player2.points} />
        </div>

        {/* Tablero */}
        <div className="gameover-board">
          <Triangle hexData={gameState.hexData} onHexClick={() => {}} scale={1} />
        </div>
      </div>

      {/* Botón */}
      <button
        className="gameover-button"
        onClick={() => navigate("/")}
      >
        {t("gameOver.goHome")}
      </button>
    </div>
  );
};

export default GameOver;
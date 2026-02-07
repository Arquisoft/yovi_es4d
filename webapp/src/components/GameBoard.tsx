import React from "react";
import Triangle from "./Triangle";
import Jugador from "./player";
import "./GameBoard.css"; // importamos el CSS

const GameBoard: React.FC = () => {
  return (
    <div className="gameboard-container">
      {/* Jugador 1 esquina superior izquierda */}
      <div className="player1">
        <Jugador name="Jugador 1" imgSrc="logo.png" points={33} isActive={true} />
      </div>

      {/* Jugador 2 esquina superior derecha */}
      <div className="player2">
        <Jugador name="Jugador 2" imgSrc="logo.png" points={2} isActive={false} />
      </div>

      {/* Tablero centrado */}
      <Triangle />

      {/* Botones centrados abajo */}
     <div className="board-buttons">
  <button className="undo">Undo</button>
  <button className="redo">Redo</button>
</div>

    </div>
  );
};

export default GameBoard;

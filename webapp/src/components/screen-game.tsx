import React from "react";
import "./GameBoard.css"; // Aquí pondremos los estilos
import Triangle from "./Triangle";
const BOARD_SIZE = 6; // Número de hexágonos por lado

type Player = {
  name: string;
  img: string;
  isYourTurn: boolean;
};

type HexTileProps = {
  color: "red" | "blue" | "white";
};

const HexTile: React.FC<HexTileProps> = ({ color }) => {
  return <div className={`hex ${color}`}></div>;
};



const GameBoard: React.FC = () => {
  // Tablero ejemplo (triángulo equilátero con filas de 1 a 5)
 
  return (
    // Dentro del return de GameBoard
    <div className="board-container">
      
        <Triangle />
   
    </div>
  );
};

export default GameBoard;

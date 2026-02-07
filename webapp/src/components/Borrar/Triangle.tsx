import React from "react";
import Hexagon from "./Hexagon";
import "./Triangle.css";

const N = 13;

const Triangle: React.FC = () => {
  const side = Math.min(window.innerWidth, window.innerHeight);

  // Triángulo que ocupa casi toda la pantalla
  const triangleWidth = side * 0.9;
  const triangleHeight = side * 0.9;

  // Tamaño máximo horizontal para 13 hexágonos en la base
  const hexWidthByBase = triangleWidth / N;

  // Tamaño máximo vertical para que quepan N filas
  const hexWidthByHeight = (triangleHeight / (0.75 * (N - 1) + 1)) * 1.1547;

  // Escoger el tamaño que encaje en ambos sentidos
  const hexWidth = Math.min(hexWidthByBase, hexWidthByHeight);
  const hexHeight = hexWidth / 1.1547;

  // Punto base (fila inferior)
  const baseY = triangleHeight - hexHeight;

  const hexagons: JSX.Element[] = [];

  for (let row = 0; row < N; row++) {
    const hexCount = N - row; // base primero
    const rowWidth = hexCount * (hexWidth * 1.55); // ancho real de la fila (con solapamiento)

    // Altura acumulada desde la base
    const y = row * hexHeight * 0.75;

    // Centrar fila
    const rowOffsetX = (triangleWidth - rowWidth) / 2;

    for (let col = 0; col < hexCount; col++) {
      const left = rowOffsetX + col * (hexWidth*1.55);
      const top = baseY - y;

      hexagons.push(
        <Hexagon
          key={`${row}-${col}`}
          width={hexWidth}
          height={hexHeight}
          left={left}
          top={top}
          onClick={() => console.log(`Hex ${row}-${col} clicked`)}
        />
      );
    }
  }

  return (
    <div
      className="triangle-container"
      style={{
        width: hexWidth * N,
        height: hexHeight * N,
      }}
    >
      {hexagons}
    </div>
  );
};

export default Triangle;

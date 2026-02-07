import React from "react";
import "./Triangle.css";

const N = 6; // filas/base

const Triangle: React.FC = () => {
  const side = Math.min(window.innerWidth, window.innerHeight); // referencia de tamaño

  // Tamaño del hexágono
  const hexHeight = Math.min(
    side / (1 + (N - 1) * 0.75),
    side / (N + 1) / 1.1547
  );
  const hexWidth = hexHeight * 1.1547;

  // Altura total del triángulo de hexágonos
  const triangleHeight = hexHeight + (N - 1) * hexHeight * 0.75;
  const containerWidth = N * hexWidth;
  const containerHeight = triangleHeight;

  const rows: JSX.Element[] = [];

  for (let row = 0; row < N; row++) {
    const hexCount = row + 1;
    const rowWidth = hexWidth + (hexCount - 1) * hexWidth;

    // Centrar horizontalmente dentro del contenedor
    const rowOffsetX = (containerWidth - rowWidth) / 2;

    for (let col = 0; col < hexCount; col++) {
      const left = rowOffsetX + col * hexWidth;

      // Posición vertical desde abajo
      const top = row * hexHeight * 0.75;

      rows.push(
        <button
          key={`${row}-${col}`}
          className="hex"
          style={{
            width: hexWidth,
            height: hexHeight,
            left,
            top,
            position: "absolute",
          }}
        />
      );
    }
  }

  return (
    <div
      className="triangle-container"
      style={{
        width: containerWidth,
        height: containerHeight,
        position: "relative",
        background: "#f0f0f0", // opcional para ver el contenedor
      }}
    >
      {rows}
    </div>
  );
};

export default Triangle;

import React from "react";
import "./Triangle.css";

const N = 4; // filas/base
const MARGIN = 10; // margen dentro del triángulo

const Triangle: React.FC = () => {
  const side = Math.min(window.innerWidth, window.innerHeight); // triángulo de fondo
  const size = side - MARGIN * 3; // tamaño ocupado por los hexágonos

  // Tamaño del hexágono
  const hexHeight = Math.min(
    size / (1 + (N - 1) * 0.75),
    size / (N + 1) / 1.1547
  );
  const hexWidth = hexHeight * 1.1547;

  // Tamaño total ocupado por los hexágonos
  const totalHexWidth = N * hexWidth;
  const totalHexHeight = hexHeight + (N - 1) * hexHeight * 0.75;

  // Altura del triángulo de fondo (equilátero usando la base de hexágonos)
  const triangleHeight = (hexHeight * (N+0.5)) * 0.8660254;

  // Offset horizontal: centrado
  const offsetX = (side - totalHexWidth) / 2;

  // Offset vertical: la base de los hexágonos toca la base del triángulo
  const offsetY = triangleHeight - totalHexHeight - MARGIN;

  const rows: JSX.Element[] = [];

  for (let row = 0; row < N; row++) {
    const hexCount = row + 1;
    const rowWidth = hexWidth + (hexCount - 1) * hexWidth;

    // Centrar cada fila dentro del triángulo de hexágonos
    const rowOffsetX = (totalHexWidth - rowWidth) / 2;

    for (let col = 0; col < hexCount; col++) {
      const left = offsetX + rowOffsetX + col * hexWidth;
      const top = offsetY + row * hexHeight * 0.75;

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
        width: side,
        height: triangleHeight,
        background: "burlywood",
        position: "relative",
      }}
    >
      {rows}
    </div>
  );
};

export default Triangle;

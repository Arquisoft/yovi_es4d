import React, { useState, useEffect } from "react";
import Hexagon from "./Hexagon";
import "./Triangle.css";

const N = 4; // filas/base

// Función equivalente a Rust `from_index`
function fromIndex(index: number, boardSize: number) {
  const r = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
  const rowStartIndex = (r * (r + 1)) / 2;
  const c = index - rowStartIndex;

  const x = boardSize - 1 - r; // fila invertida como en Rust
  const y = c;
  const z = boardSize - 1 - x - y;

  return { x, y, z };
}

const Triangle: React.FC = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const side = Math.min(window.innerWidth, window.innerHeight);

  const hexHeight = Math.min(
    side / (1 + (N - 1) * 0.75),
    side / (N + 1) / 1.1547
  );
  const hexWidth = hexHeight * 1.1547;

  const triangleHeight = hexHeight + (N - 1) * hexHeight * 0.75;
  const containerWidth = N * hexWidth;
  const containerHeight = triangleHeight;

  const rows: JSX.Element[] = [];
  let index = 0; // índice lineal para fromIndex

  for (let row = 0; row < N; row++) {
    const hexCount = row + 1;
    const rowWidth = hexWidth + (hexCount - 1) * hexWidth;
    const rowOffsetX = (containerWidth - rowWidth) / 2;

    for (let col = 0; col < hexCount; col++) {
      const left = rowOffsetX + col * hexWidth;
      const top = row * hexHeight * 0.75;

      // ✅ Calculamos las coordenadas usando fromIndex
      const { x, y, z } = fromIndex(index, N);
      const position = `(${x},${y},${z})`;

      rows.push(
        <Hexagon
          key={position}
          width={hexWidth}
          height={hexHeight}
          left={left}
          top={top}
          position={position}
          player={index % 2 === 0 ? "j1" : "j2"}
        />
      );

      index++; // avanzamos al siguiente índice
    }
  }

  return (
    <div
      className="triangle-container"
      style={{
        width: containerWidth,
        height: containerHeight,
        position: "relative",
      }}
    >
      {rows}
    </div>
  );
};

export default Triangle;

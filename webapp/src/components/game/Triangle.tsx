import React, { useState, useEffect } from "react";
import Hexagon from "./Hexagon";
import "./Triangle.css";

// Determine board size from hexData length (n*(n+1)/2 = total cells)
// If hexData is empty, fall back to 4
function computeBoardSize(totalCells: number) {
  if (!totalCells || totalCells <= 0) return 4;
  return Math.floor((Math.sqrt(8 * totalCells + 1) - 1) / 2);
}

interface HexData {
  position: string;
  player: "j1" | "j2" | null;
}

interface TriangleProps {
  hexData: HexData[];
  onHexClick: (position: string) => void;
  scale?: number;
}

// Función equivalente a Rust `from_index`
function fromIndex(index: number, boardSize: number) {
  const r = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
  const rowStartIndex = (r * (r + 1)) / 2;
  const c = index - rowStartIndex;

  const x = boardSize - 1 - r; // fila invertida
  const y = c;
  const z = boardSize - 1 - x - y;

  return { x, y, z };
}

const ASIDE_WIDTH = 144;   // gb-player-aside width (desktop)
const ASIDE_GAP   = 24;    // gap entre aside y board-section
const HEADER_H    = 56;    // altura aproximada header + footer

const Triangle: React.FC<TriangleProps> = ({ hexData, onHexClick, scale = 1 }) => {
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setWin({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const boardSize = computeBoardSize(hexData.length);

  const isMobile = win.w <= 640;
  const availW = isMobile ? win.w - 32 : win.w - 2 * ASIDE_WIDTH - 4 * ASIDE_GAP;
  const availH = win.h - HEADER_H;
  const side = Math.min(availW, availH) * scale;

  const hexHeight = Math.min(
    side / (1 + (boardSize - 1) * 0.75),
    side / (boardSize + 1) / 1.1547
  );
  const hexWidth = hexHeight * 1.1547;
  const triangleHeight = hexHeight + (boardSize - 1) * hexHeight * 0.75;
  const containerWidth = boardSize * hexWidth;
  const containerHeight = triangleHeight;

  const rows: JSX.Element[] = [];
  let index = 0;

  for (let row = 0; row < boardSize; row++) {
    const hexCount = row + 1;
    const rowWidth = hexWidth + (hexCount - 1) * hexWidth;
    const rowOffsetX = (containerWidth - rowWidth) / 2;

    for (let col = 0; col < hexCount; col++) {
      const left = rowOffsetX + col * hexWidth;
      const top = row * hexHeight * 0.75;
      const { x, y, z } = fromIndex(index, boardSize);
      const position = `(${x},${y},${z})`;

      // Busca el estado del hexágono desde el backend
      const hex = hexData.find((h) => h.position === position);
      rows.push(
        <Hexagon
          key={position}
          width={hexWidth}
          height={hexHeight}
          left={left}
          top={top}
          position={position}
          player={hex?.player || null}
          onClick={() => onHexClick(position)}
        />
      );

      index++;
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
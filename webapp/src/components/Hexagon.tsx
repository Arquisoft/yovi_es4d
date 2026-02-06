import React from "react";

interface HexProps {
  size: number;
  row: number;
  col: number;
  coord: [number, number, number];
}

const Hexagon: React.FC<HexProps> = ({ size, row, col, coord }) => {

  const width = size;
  const height = size * 1.1547;

  const left = col * width + row * width / 2;
  const top = row * height * 0.75;

  return (
    <button
      className="hex"
      style={{
        width,
        height,
        left,
        top,
        position: "absolute"
      }}
    >
      {coord.join(",")}
    </button>
  );
};

export default Hexagon;

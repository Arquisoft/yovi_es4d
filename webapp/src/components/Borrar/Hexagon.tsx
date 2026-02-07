import React from "react";
import "./Hexagon.css";

interface HexagonProps {
  width: number;
  height: number;
  left: number;
  top: number;
  onClick?: () => void;
}

const Hexagon: React.FC<HexagonProps> = ({ width, height, left, top, onClick }) => {
  return (
    <button
      className="hex"
      style={{
        width,
        height,
        left,
        top,
        position: "absolute",
      }}
      onClick={onClick}
    />
  );
};

export default Hexagon;

import React from "react";
import "./Hexagon.css";

interface HexagonProps {
  width: number;
  height: number;
  left: number;
  top: number;
  position: string;
  player?: "j1" | "j2" | null; // ahora puede ser null
  onClick: () => void; // nueva prop
}

const Hexagon: React.FC<HexagonProps> = ({ width, height, left, top, position, player, onClick }) => {
  const classes = ["hex"];
  if (player) {
    classes.push("clicked");
    classes.push(player);
  }
  return (
    <button
      className={classes.join(" ")}
      style={{
        width,
        height,
        left,
        top,
        position: "absolute",
      }}
      onClick={onClick}
      disabled={!!player} // deshabilita si ya hay jugador
      data-position={position}
    >
      {player ? (player === "j1" ? " " : " ") : position}
    </button>
  );
};

export default Hexagon;

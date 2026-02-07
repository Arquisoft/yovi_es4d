import React, { useState } from "react";
import "./Hexagon.css";

interface HexagonProps {
  width: number;
  height: number;
  left: number;
  top: number;
  position: string;
  player?: "j1" | "j2"; // nuevo prop para indicar el jugador
}

const Hexagon: React.FC<HexagonProps> = ({ width, height, left, top, position, player }) => {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    if (!clicked) {
      setClicked(true);
      console.log(`Hexágono ${position} pulsado por ${player}`);
    }
  };

  const classes = ["hex"];
  if (player) classes.push(player);
  if (clicked) classes.push("clicked");

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
      onClick={handleClick}
      disabled={clicked}
      data-position={position}
    >
      {position}
    </button>
  );
};

export default Hexagon;

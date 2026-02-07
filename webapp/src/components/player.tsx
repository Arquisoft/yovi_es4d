import React from "react";
import "./player.css";

interface PlayerInfoProps {
  name: string;
  imgSrc: string;
  points: number;
  isActive?: boolean;
  isPlaying?: boolean;
}

const Jugador: React.FC<PlayerInfoProps> = ({
  name,
  imgSrc,
  points,
  isActive = false,
  isPlaying = false,
}) => {
  return (
    <div className={`player-info ${isActive ? "active" : ""}`}>
      <div className="player-img-container">
        <img src={imgSrc} alt={name} className="player-img" />
        <span className="player-points">{points}</span>
      </div>
      <div className="player-name">{name}</div>
      <div className="player-status">{isPlaying ? "Jugando..." : "Esperando..."}</div>
      {isActive && <span className="active-indicator"></span>}
    </div>
  );
};

export default Jugador;

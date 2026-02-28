import React from "react";
import "./game.css";

interface PlayerInfoProps {
  name: string;
  imgSrc: string;
  points: number;
  isActive?: boolean;
  isPlaying?: boolean;
  color?: "violet" | "coral";
}

const Jugador: React.FC<PlayerInfoProps> = ({
                                              name,
                                              imgSrc,
                                              points,
                                              isActive = false,
                                              isPlaying = false,
                                              color = "violet",
                                            }) => {
  const accent     = color === "violet" ? "#7c6ff7" : "#f97058";
  const accentText = color === "violet" ? "text-[#7c6ff7]" : "text-[#f97058]";
  const accentBg   = color === "violet" ? "bg-[#7c6ff7]"   : "bg-[#f97058]";
  const accentBorder = color === "violet" ? "border-[#7c6ff7]" : "border-[#f97058]";
  const activeClass  = isActive
      ? color === "violet" ? "active-j1" : "active-j2"
      : "";

  return (
      <div
          className={`relative flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-[#e8e2d9] ${activeClass}`}
          style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {/* Punto indicador de turno */}
        {isActive && (
            <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${accentBg} animate-pulse`} />
        )}

        {/* Avatar */}
        <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${isActive ? accentBorder : "border-[#e8e2d9]"}`}>
          <img src={imgSrc} alt={name} className="w-full h-full object-cover" />
        </div>

        {/* Nombre */}
        <p className={`text-sm font-semibold tracking-wide ${isActive ? accentText : "text-[#9e9890]"}`}>
          {name}
        </p>

        {/* Puntos */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-[#c4bdb4] tracking-[0.2em] uppercase mb-0.5">Score</span>
          <span
              className={`text-3xl font-bold tabular-nums ${isActive ? accentText : "text-[#c4bdb4]"}`}
              style={{ fontFamily: "'DM Mono', monospace" }}
          >
          {String(points).padStart(4, "0")}
        </span>
        </div>

        {/* Bot pensando */}
        {isPlaying && (
            <div className="flex gap-1.5 items-center mt-1">
              {[0, 1, 2].map(i => (
                  <span key={i} className={`thinking-dot w-1.5 h-1.5 rounded-full ${accentBg}`} />
              ))}
            </div>
        )}
      </div>
  );
};

export default Jugador;
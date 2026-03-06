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
                                                isActive  = false,
                                                isPlaying = false,
                                                color     = "violet",
                                            }) => {
    const activeClass = isActive
        ? color === "violet" ? "active-j1" : "active-j2"
        : "";

    return (
        <div className={`player-card ${activeClass}`}>

            {isActive && (
                <span className={`player-active-dot ${color} animate-pulse`} />
            )}

            <div className={`player-avatar ${isActive ? `active-${color}` : ""}`}>
                <img src={imgSrc} alt={name} />
            </div>

            <p className={`player-name ${isActive ? `active-${color}` : ""}`}>
                {name}
            </p>

            <div className="flex flex-col items-center">
                <div className="player-score-label">Score</div>
                <div className={`player-score ${isActive ? `active-${color}` : ""}`}>
                    {String(points).padStart(4, "0")}
                </div>
            </div>

            {isPlaying && (
                <div className="player-thinking">
                    {[0,1,2].map(i => (
                        <span key={i} className={`thinking-dot`} style={{
                            width: 6, height: 6, borderRadius: "50%", display: "inline-block",
                            background: color === "violet" ? "var(--violet)" : "var(--coral)",
                        }} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Jugador;
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Triangle from "./game/Triangle";
import "./GameOver.css";
import { useTranslation } from "../i18n";

const GameOver: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const gameState = location.state as any;

    // ── Sin estado ───────────────────────────────────────────
    if (!gameState) {
        return (
            <div className="go-empty">
                <span style={{ fontSize: "2rem" }}>◈</span>
                <p>{t('gameOver.noGame')}</p>
                <button className="go-btn-primary" onClick={() => navigate("/")}>
                    {t('gameOver.goHome')}
                </button>
            </div>
        );
    }

    const player1   = gameState.players[0];
    const player2   = gameState.players[1];
    const winnerId  = gameState.winner; // "j1" | "j2"
    const isJ2Win   = winnerId === "j2";

    const userProfile     = gameState.userProfile     as { username: string; avatar: string } | undefined;
    const opponentProfile = gameState.opponentProfile as { username: string; avatar: string } | undefined;
    const gameMode        = gameState.gameMode        as string | undefined;
    const onlineRole      = gameState.onlineRole      as string | undefined;

    const myName         = userProfile?.username     || player1?.name;
    const myAvatar       = userProfile?.avatar       || "logo.png";
    const opponentName   = opponentProfile?.username || player2?.name;
    const opponentAvatar = opponentProfile?.avatar   || "logo.png";

    const isMySlotJ1 = gameMode !== "online" || onlineRole === "j1";

    const p1Name   = isMySlotJ1 ? myName         : opponentName;
    const p1Avatar = isMySlotJ1 ? myAvatar        : opponentAvatar;
    const p2Name   = isMySlotJ1 ? opponentName                                    : myName;
    const p2Avatar = isMySlotJ1 ? (gameMode === "vsBot" ? "🤖" : opponentAvatar) : myAvatar;

    const winnerName = winnerId === "j1" ? p1Name : p2Name;

    return (
        <div className="go-container">

            {/* Trofeo */}
            <div className="go-trophy">🏆</div>

            {/* Badge */}
            <div className="go-badge">
                <span>{t('gameOver.title')}</span>
            </div>

            {/* Título */}
            <h1 className={`go-title${isJ2Win ? " winner-j2" : ""}`}>
                <span className="go-winner-name">{winnerName ?? t('gameOver.winner')}</span>
                {" "}{t('gameOver.hasWon')}
            </h1>
            <p className="go-subtitle">
                {t('gameOver.finalScore')} {gameState.hexData?.length ? t('gameOver.completed') : ""}
            </p>

            {/* Contenido */}
            <div className="go-content">

                {/* Jugadores */}
                <div className="go-players">
                    {[
                        { name: p1Name,   avatar: p1Avatar, points: player1?.points ?? 0, role: "j1" },
                        { name: p2Name,   avatar: p2Avatar, points: player2?.points ?? 0, role: "j2" },
                    ].map((p, idx) => {
                        const isWinner = (idx === 0 && winnerId === "j1") || (idx === 1 && winnerId === "j2");
                        const isCoralW = isWinner && idx === 1;
                        return (
                            <div
                                key={p.role}
                                className={`go-player-card${isWinner ? ` winner-card${isCoralW ? " coral-winner" : ""}` : ""}`}
                            >
                                {isWinner && <span className="go-winner-crown">👑</span>}

                                <div className="go-player-avatar">
                                    {p.avatar.includes(".") || p.avatar.includes("/")
                                        ? <img src={p.avatar} alt={p.name} />
                                        : <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>{p.avatar}</span>
                                    }
                                </div>

                                <span className="go-player-name">{p.name}</span>

                                <div>
                                    <div className="go-score-label">{t('gameOver.score')}</div>
                                    <div className="go-score">{String(p.points).padStart(4, "0")}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tablero de solo lectura */}
                <div className="go-board">
                    <Triangle
                        hexData={gameState.hexData}
                        onHexClick={() => {}}
                        scale={0.75}
                    />
                </div>

            </div>

            {/* Acciones */}
            <div className="go-actions">
                <button className="go-btn-primary" onClick={() => navigate("/select")}>
                    {t('gameOver.newGame')}
                </button>
                <button className="go-btn-secondary" onClick={() => navigate("/")}>
                    {t('gameOver.goHome')}
                </button>
            </div>

            {/* Decoración */}
            <div className="go-decoration">
                <div className="go-decoration-line" />
                <span className="go-decoration-text">YOVI_ES4D</span>
                <div className="go-decoration-line" />
            </div>

        </div>
    );
};

export default GameOver;
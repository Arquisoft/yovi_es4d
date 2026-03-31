import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config";
import "./game.css";

const BOT_MODE_META: Record<string, { label: string; description: string; tag: string; emoji: string }> = {
    random_bot:       { label: "Aleatorio",  description: "El bot sigue ninguna estratégia, se comporta de manera aleatoria.", tag: "Fácil", emoji: "" },
    intermediate_bot: { label: "Intermedio", description: "El bot evalúa el tablero y busca las mejores jugadas.",              tag: "Medio",  emoji: "" },
    hard_bot:         { label: "Difícil",    description: "El bot juega al límite de sus capacidades. Solo para expertos.", tag: "Difícil", emoji: "" },
};

const BOARD_SIZES = [
    { value: 8,  label: "Pequeño", description: "36 celdas · Partida rápida",  tag: "8×"  },
    { value: 11, label: "Normal",  description: "66 celdas · Partida ágil",    tag: "11×" },
    { value: 15, label: "Grande",  description: "120 celdas · Más estrategia", tag: "15×" },
    { value: 19, label: "Extra",   description: "190 celdas · Para expertos",  tag: "19×" },
];

const GAME_MODE_META: Record<string, { label: string; description: string }> = {
    vsBot:       { label: "Contra la máquina", description: "Juega contra la IA."                 },
    multiplayer: { label: "2 Jugadores",        description: "Dos personas en el mismo ordenador." },
};


const ModeSelector: React.FC = () => {
    const navigate = useNavigate();
    const [availableBotModes, setAvailableBotModes] = useState<string[]>([]);
    const [selectedBotMode, setSelectedBotMode]     = useState<string>("random_bot"); //Por defecto es el bot random
    const [selectedBoardSize, setSelectedBoardSize] = useState<number>(11);
    const [selectedGameMode, setSelectedGameMode]   = useState<string>("vsBot"); //Por defecto es contra el bot
    const [loading, setLoading]                     = useState(true);

    useEffect(() => {
        const fetchBotModes = async () => {
            try {
                const res  = await fetch(`${API_URL}/api/game/bot-modes`,  {
                credentials: "include"
                });
                const data = await res.json();
                const modes: string[] = data.botModes ?? [];
                setAvailableBotModes(modes);
                if (modes.length > 0) setSelectedBotMode(modes[0]);
            } catch {
                setAvailableBotModes(["random_bot"]);
            } finally {
                setLoading(false);
            }
        };
        fetchBotModes();
    }, []);

    const handleStart = () => {
        if (selectedGameMode === "online") {
            navigate("/online-lobby");
        } else {
            navigate("/game", {
                state: { gameMode: selectedGameMode, botMode: selectedBotMode, boardSize: selectedBoardSize },
            });
        }
    };

    return (
        <div className="game-bg min-h-screen flex flex-col items-center justify-center px-6 py-16">

            {/* Cabecera */}
            <div className="ms-header fade-up">
                <div className="ms-badge">
                    <span>Nueva partida</span>
                </div>
                <h1 className="ms-title">Configura la partida</h1>
                <p className="ms-subtitle">Elige dificultad y tamaño del tablero</p>
            </div>

            <div className="ms-body">

              
            {/* ── Online ── */}
                <div className="fade-up">
                    <button
                        className="ms-mode-card fade-up"
                        onClick={() => navigate("/online-lobby")}
                    >
                        <div className="ms-mode-info">
                            <div className="ms-mode-name-row">
                                <span className="ms-mode-name">🌐 Jugar online</span>
                            </div>
                            <p className="ms-mode-desc">Juega con un amigo a distancia usando un código.</p>
                        </div>
                    </button>
                </div>

                <div style={{ marginTop: "1.5rem" }} />

            {/* ── Modo de juego ── */}
                <div className="fade-up">
                    <p className="ms-section-label">Modo de juego</p>
                    <div className="ms-difficulty-list">
                        {Object.entries(GAME_MODE_META).map(([mode, meta]) => {
                            const isSelected = selectedGameMode === mode;
                            return (
                                <button
                                    key={mode}
                                    onClick={() => setSelectedGameMode(mode)}
                                    className={`ms-mode-card fade-up${isSelected ? " selected" : ""}`}
                                >
                                    <div className="ms-mode-info">
                                        <div className="ms-mode-name-row">
                                            <span className="ms-mode-name">{meta.label}</span>
                                        </div>
                                        <p className="ms-mode-desc">{meta.description}</p>
                                    </div>
                                    <div className={`ms-radio${isSelected ? " checked" : ""}`}>
                                        {isSelected && <span className="ms-radio-dot" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
 
                {/* ── Dificultad (solo en vsBot) ── */}
                <div className="fade-up" style={{ display: selectedGameMode === "vsBot" ? "block" : "none" }}>
                    <p className="ms-section-label">Dificultad de bot</p>
 
                    {loading ? (
                        <div className="flex items-center gap-2 mb-6">
                            {[0,1,2].map(i => <span key={i} className="thinking-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--violet)", display: "inline-block" }} />)}
                        </div>
                    ) : (
                        <div className="ms-difficulty-list">
                            {availableBotModes.map((mode) => {
                                const meta       = BOT_MODE_META[mode];
                                const isSelected = selectedBotMode === mode;
                                return (
                                    <button
                                        key={mode}
                                        onClick={() => setSelectedBotMode(mode)}
                                        className={`ms-mode-card fade-up${isSelected ? " selected" : ""}`}
 
                                    >
                                        <span className="ms-mode-emoji">{meta?.emoji ?? "🤖"}</span>
 
                                        <div className="ms-mode-info">
                                            <div className="ms-mode-name-row">
                                                <span className="ms-mode-name">{meta?.label ?? mode}</span>
 
                                            </div>
                                            <p className="ms-mode-desc">{meta?.description}</p>
                                        </div>
 
                                        <div className={`ms-radio${isSelected ? " checked" : ""}`}>
                                            {isSelected && <span className="ms-radio-dot" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Tamaño del tablero ── */}
                <div className="fade-up">
                    <p className="ms-section-label">Tamaño del tablero</p>
                    <div className="ms-size-grid">
                        {BOARD_SIZES.map((size) => {
                            const isSelected = selectedBoardSize === size.value;
                            return (
                                <button
                                    key={size.value}
                                    onClick={() => setSelectedBoardSize(size.value)}
                                    className={`ms-size-card fade-up${isSelected ? " selected" : ""}`}

                                >
                                    <div className="ms-size-badge">{size.tag}</div>
                                    <div className="ms-size-label">{size.label}</div>
                                    <div className="ms-size-desc">{size.description}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Botón Jugar */}
                <div className="fade-up">
                    <button className="ms-play-btn" onClick={handleStart} disabled={loading}>
                        Jugar →
                    </button>
                </div>
            </div>

            {/* Decoración */}
            <div className="ms-decoration fade-up">
                <div className="ms-decoration-line" />
                <span className="ms-decoration-text">YOVI</span>
                <div className="ms-decoration-line" />
            </div>
        </div>
    );
};

export default ModeSelector;
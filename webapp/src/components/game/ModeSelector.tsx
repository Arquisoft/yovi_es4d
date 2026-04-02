import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config";
import "./game.css";

// ── Metadatos estáticos ────────────────────────────────────

const BOT_MODES: Record<string, { label: string; description: string; tagLabel: string; tagClass: string }> = {
    random_bot:       { label: "Aleatorio",  description: "El bot elige casillas al azar.",                   tagLabel: "Fácil",   tagClass: "text-green-700 bg-green-100 border border-green-300"   },
    intermediate_bot: { label: "Intermedio", description: "El bot evalúa el tablero y busca buenas jugadas.", tagLabel: "Medio",   tagClass: "text-yellow-700 bg-yellow-100 border border-yellow-300" },
    hard_bot:         { label: "Difícil",    description: "El bot juega al límite de sus capacidades.",       tagLabel: "Difícil", tagClass: "text-red-700 bg-red-100 border border-red-300"         },
};

const BOARD_SIZES = [
    { value: 8,  label: "Pequeño", description: "36 celdas · Rápida",    tag: "8×"  },
    { value: 11, label: "Normal",  description: "66 celdas · Ágil",      tag: "11×" },
    { value: 15, label: "Grande",  description: "120 celdas · Táctica",  tag: "15×" },
    { value: 19, label: "Extra",   description: "190 celdas · Expertos", tag: "19×" },
];

const LOCAL_MODES: { id: string; label: string; description: string }[] = [
    { id: "vsBot",       label: "Contra la máquina", description: "Juega solo contra la IA."                },
    { id: "multiplayer", label: "2 Jugadores",        description: "Dos personas en el mismo ordenador."    },
];

// ── Componente ─────────────────────────────────────────────

const ModeSelector: React.FC = () => {
    const navigate = useNavigate();

    const [botModes, setBotModes]       = useState<string[]>([]);
    const [loading, setLoading]         = useState(true);
    const [gameMode, setGameMode]       = useState("vsBot");
    const [botMode, setBotMode]         = useState("random_bot");
    const [boardSize, setBoardSize]     = useState(11);

    useEffect(() => {
        fetch(`${API_URL}/api/game/bot-modes`, { credentials: "include" })
            .then(r => r.json())
            .then(data => {
                const modes: string[] = data.botModes ?? [];
                setBotModes(modes);
                if (modes.length > 0) setBotMode(modes[0]);
            })
            .catch(() => setBotModes(["random_bot"]))
            .finally(() => setLoading(false));
    }, []);

    const handleStart = () => {
        navigate("/game", { state: { gameMode, botMode, boardSize } });
    };

    return (
        <div className="game-bg min-h-screen flex flex-col items-center justify-center px-6 py-16">

            {/* Cabecera */}
            <div className="ms-header fade-up">
                <div className="ms-badge"><span>Nueva partida</span></div>
                <h1 className="ms-title">Configura la partida</h1>
                <p className="ms-subtitle">Elige cómo quieres jugar</p>
            </div>

            <div className="ms-body">

                {/* ══ Sección ONLINE ═══════════════════════════════════ */}
                <div className="fade-up">
                    <p className="ms-section-label">En línea</p>
                    <button
                        className="ms-mode-card"
                        onClick={() => navigate("/online-lobby")}
                    >
                        <span className="ms-mode-emoji">🌐</span>
                        <div className="ms-mode-info">
                            <div className="ms-mode-name-row">
                                <span className="ms-mode-name">Jugar online</span>
                            </div>
                            <p className="ms-mode-desc">Juega con un amigo a distancia usando un código de sala.</p>
                        </div>
                        <span style={{ color: "var(--violet)", fontSize: "1.1rem" }}>→</span>
                    </button>
                </div>

                {/* Separador */}
                <div className="fade-up flex items-center gap-3 my-2">
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", letterSpacing: "0.1em" }}>LOCAL</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>

                {/* ══ Sección LOCAL ════════════════════════════════════ */}

                {/* Modo de juego */}
                <div className="fade-up">
                    <p className="ms-section-label">Modo de juego</p>
                    <div className="ms-difficulty-list">
                        {LOCAL_MODES.map(({ id, label, description }) => (
                            <button
                                key={id}
                                onClick={() => setGameMode(id)}
                                className={`ms-mode-card${gameMode === id ? " selected" : ""}`}
                            >
                                <div className="ms-mode-info">
                                    <div className="ms-mode-name-row">
                                        <span className="ms-mode-name">{label}</span>
                                    </div>
                                    <p className="ms-mode-desc">{description}</p>
                                </div>
                                <div className={`ms-radio${gameMode === id ? " checked" : ""}`}>
                                    {gameMode === id && <span className="ms-radio-dot" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dificultad del bot (solo en vsBot) */}
                {gameMode === "vsBot" && (
                    <div className="fade-up">
                        <p className="ms-section-label">Dificultad</p>
                        {loading ? (
                            <div className="flex items-center gap-2 mb-6">
                                {[0, 1, 2].map(i => (
                                    <span key={i} className="thinking-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--violet)", display: "inline-block" }} />
                                ))}
                            </div>
                        ) : (
                            <div className="ms-difficulty-list">
                                {botModes.map(mode => {
                                    const meta = BOT_MODES[mode];
                                    return (
                                        <button
                                            key={mode}
                                            onClick={() => setBotMode(mode)}
                                            className={`ms-mode-card${botMode === mode ? " selected" : ""}`}
                                        >
                                            <div className="ms-mode-info">
                                                <div className="ms-mode-name-row">
                                                    <span className="ms-mode-name">{meta?.label ?? mode}</span>
                                                    {meta?.tagLabel && (
                                                        <span className={`ms-tag ${meta.tagClass}`}>{meta.tagLabel}</span>
                                                    )}
                                                </div>
                                                <p className="ms-mode-desc">{meta?.description}</p>
                                            </div>
                                            <div className={`ms-radio${botMode === mode ? " checked" : ""}`}>
                                                {botMode === mode && <span className="ms-radio-dot" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Tamaño del tablero */}
                <div className="fade-up">
                    <p className="ms-section-label">Tamaño del tablero</p>
                    <div className="ms-size-grid">
                        {BOARD_SIZES.map(size => (
                            <button
                                key={size.value}
                                onClick={() => setBoardSize(size.value)}
                                className={`ms-size-card${boardSize === size.value ? " selected" : ""}`}
                            >
                                <div className="ms-size-badge">{size.tag}</div>
                                <div className="ms-size-label">{size.label}</div>
                                <div className="ms-size-desc">{size.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Botón jugar */}
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

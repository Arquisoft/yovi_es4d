import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config";
import "./game.css";
import UserHeader from "../UserHeader";

const BOT_MODES: Record<string, { label: string; description: string; tagLabel: string; tagClass: string }> = {
    random_bot:       { label: "Aleatorio",  description: "El bot elige nodos al azar.",                        tagLabel: "Facil",   tagClass: "text-green-700 bg-green-100 border border-green-300"   },
    intermediate_bot: { label: "Intermedio", description: "El bot intenta agrupar conexiones utiles.",          tagLabel: "Medio",   tagClass: "text-yellow-700 bg-yellow-100 border border-yellow-300" },
    hard_bot:         { label: "Dificil",    description: "El bot prioriza rutas que acerquen a las 4 caras.", tagLabel: "Dificil", tagClass: "text-red-700 bg-red-100 border border-red-300"         },
};


const TIME_LIMITS = [
    { value: 0,  label: "∞",     description: "Sin límite" },
    { value: 15, label: "15s",   description: "Rápido"     },
    { value: 30, label: "30s",   description: "Normal"     },
    { value: 60, label: "60s",   description: "Relajado"   },
];

const BOARD_SIZES = [
    { value: 8,  label: "Pequeño", description: "36 celdas · Rápida",    tag: "8×"  },
    { value: 11, label: "Normal",  description: "66 celdas · Ágil",      tag: "11×" },
    { value: 15, label: "Grande",  description: "120 celdas · Táctica",  tag: "15×" },
    { value: 19, label: "Extra",   description: "190 celdas · Expertos", tag: "19×" },

const LOCAL_MODES: { id: string; label: string; description: string }[] = [
    { id: "vsBot",       label: "Contra la maquina", description: "Juega solo contra la IA."             },
    { id: "multiplayer", label: "2 Jugadores",       description: "Dos personas en el mismo ordenador."  },

];

const BOARD_VARIANTS: { id: "classic" | "tetra3d"; label: string; description: string }[] = [
    { id: "classic", label: "Tablero clasico", description: "La version original de Y sobre triangulo." },
    { id: "tetra3d", label: "Tetraedro 3D", description: "Conecta las 4 caras del tetraedro para ganar." },
];

const CLASSIC_BOARD_SIZES = [
    { value: 8,  label: "Pequeno", description: "36 celdas · Rapida",    tag: "8x"  },
    { value: 11, label: "Normal",  description: "66 celdas · Agil",      tag: "11x" },
    { value: 15, label: "Grande",  description: "120 celdas · Tactica",  tag: "15x" },
    { value: 19, label: "Extra",   description: "190 celdas · Expertos", tag: "19x" },
];

const TETRA_BOARD_SIZES = [
    { value: 3, label: "Base",     description: "10 nodos · Muy rapida",  tag: "T3" },
    { value: 4, label: "Normal",   description: "20 nodos · Equilibrada", tag: "T4" },
    { value: 5, label: "Amplia",   description: "35 nodos · Estrategica", tag: "T5" },
    { value: 6, label: "Profunda", description: "56 nodos · Compleja",    tag: "T6" },
];

const ModeSelector: React.FC = () => {
    const navigate = useNavigate();

    const [botModes, setBotModes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameMode, setGameMode] = useState("vsBot");
    const [botMode, setBotMode] = useState("random_bot");
    const [boardVariant, setBoardVariant] = useState<"classic" | "tetra3d">("classic");
    const [boardSize, setBoardSize] = useState(11);
    const [player2Name, setPlayer2Name] = useState("");
    const [timeLimit, setTimeLimit]     = useState(0);
    const [startingPlayer, setStartingPlayer] = useState<"j1" | "j2">("j1");


    useEffect(() => {
        fetch(`${API_URL}/api/game/bot-modes`, { credentials: "include" })
            .then((r) => r.json())
            .then((data) => {
                const modes: string[] = data.botModes ?? [];
                setBotModes(modes);
                if (modes.length > 0) setBotMode(modes[0]);
            })
            .catch(() => setBotModes(["random_bot"]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        setStartingPlayer("j1");
    }, [gameMode]);

    useEffect(() => {
        setBoardSize(boardVariant === "tetra3d" ? 4 : 11);
    }, [boardVariant]);

    const boardSizes = boardVariant === "tetra3d" ? TETRA_BOARD_SIZES : CLASSIC_BOARD_SIZES;

    const handleStart = () => {

        navigate("/game", {
            state: {
                gameMode,
                botMode,
                boardVariant,
                timeLimit,
                boardSize,
                player2Name: player2Name.trim() || "Jugador 2",
                startingPlayer,
            },
        });
    };

    return (
        <div className="game-bg min-h-screen flex flex-col">
            <UserHeader />
            <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
                <div className="ms-header fade-up">
                    <div className="ms-badge"><span>Nueva partida</span></div>
                    <h1 className="ms-title">Configura la partida</h1>
                    <p className="ms-subtitle">Elige si quieres jugar en el tablero clasico o en un tetraedro 3D</p>
                </div>

                <div className="ms-body">
                    <div className="fade-up">
                        <p className="ms-section-label">En linea</p>
                        <button
                            className="ms-mode-card"
                            onClick={() => navigate("/online-lobby")}
                        >
                            <span className="ms-mode-emoji">🌐</span>
                            <div className="ms-mode-info">
                                <div className="ms-mode-name-row">
                                    <span className="ms-mode-name">Jugar online</span>
                                </div>
                                <p className="ms-mode-desc">La sala online mantiene el tablero clasico por ahora.</p>
                            </div>
                            <span style={{ color: "var(--violet)", fontSize: "1.1rem" }}>→</span>
                        </button>
                    </div>

                    <div className="fade-up flex items-center gap-3 my-2">
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", letterSpacing: "0.1em" }}>LOCAL</span>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>

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
                {/* Aviso de que la partida local no se guarda en el historial */}
                {gameMode === "multiplayer" && (
                    <div className="fade-up flex items-center gap-2 rounded-xl px-4 py-3 mb-1" style={{ background: "rgba(255,180,0,0.10)", border: "1px solid rgba(255,180,0,0.35)" }}>
                        <span style={{ fontSize: "1rem" }}>⚠️</span>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                            <strong style={{ color: "var(--text)" }}>Esta partida no quedará guardada en el historial.</strong>
                        </p>
                    </div>
                )}

               

                {/* Nombre del jugador 2 (solo en multiplayer) */}
                {gameMode === "multiplayer" && (
                    <div className="fade-up rounded-2xl p-5 mb-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center gap-2 mb-3">
                            <p className="ms-section-label" style={{ margin: 0 }}>Nombre del jugador 2</p>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                maxLength={20}
                                placeholder="Nombre del rival..."
                                value={player2Name}
                                onChange={e => setPlayer2Name(e.target.value)}
                                className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                                style={{
                                    background: "var(--bg)",
                                    border: `2px solid ${player2Name.trim() ? "var(--coral)" : "var(--border)"}`,
                                    color: "var(--text)",
                                    fontSize: "1rem",
                                }}
                            />
                            {player2Name.trim() && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "var(--coral)" }}>
                                    ✓
                                </span>
                            )}

                    <div className="fade-up">
                        <p className="ms-section-label">Estructura del tablero</p>
                        <div className="ms-difficulty-list">
                            {BOARD_VARIANTS.map(({ id, label, description }) => (
                                <button
                                    key={id}
                                    onClick={() => setBoardVariant(id)}
                                    className={`ms-mode-card${boardVariant === id ? " selected" : ""}`}
                                >
                                    <div className="ms-mode-info">
                                        <div className="ms-mode-name-row">
                                            <span className="ms-mode-name">{label}</span>
                                        </div>
                                        <p className="ms-mode-desc">{description}</p>
                                    </div>
                                    <div className={`ms-radio${boardVariant === id ? " checked" : ""}`}>
                                        {boardVariant === id && <span className="ms-radio-dot" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="fade-up">
                        <p className="ms-section-label">Turno inicial</p>
                        <div className="ms-difficulty-list">
                            {(gameMode === "vsBot"
                                ? [
                                    { id: "j1", label: "Empiezas tu", description: "Tu haces el primer movimiento." },
                                    { id: "j2", label: "Empieza el bot", description: "La IA juega primero." },
                                ]
                                : [
                                    { id: "j1", label: "Empieza jugador 1", description: "El jugador 1 hace el primer movimiento." },
                                    { id: "j2", label: "Empieza jugador 2", description: "El jugador 2 hace el primer movimiento." },
                                ]
                            ).map(({ id, label, description }) => (
                                <button
                                    key={id}
                                    onClick={() => setStartingPlayer(id as "j1" | "j2")}
                                    className={`ms-mode-card${startingPlayer === id ? " selected" : ""}`}
                                >
                                    <div className="ms-mode-info">
                                        <div className="ms-mode-name-row">
                                            <span className="ms-mode-name">{label}</span>
                                        </div>
                                        <p className="ms-mode-desc">{description}</p>
                                    </div>
                                    <div className={`ms-radio${startingPlayer === id ? " checked" : ""}`}>
                                        {startingPlayer === id && <span className="ms-radio-dot" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {gameMode === "multiplayer" && (
                        <div className="fade-up rounded-2xl p-5 mb-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <div className="flex items-center gap-2 mb-3">
                                <p className="ms-section-label" style={{ margin: 0 }}>Nombre del jugador 2</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    maxLength={20}
                                    placeholder="Nombre del rival..."
                                    value={player2Name}
                                    onChange={(e) => setPlayer2Name(e.target.value)}
                                    className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                                    style={{
                                        background: "var(--bg)",
                                        border: `2px solid ${player2Name.trim() ? "var(--coral)" : "var(--border)"}`,
                                        color: "var(--text)",
                                        fontSize: "1rem",
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {gameMode === "vsBot" && (
                        <div className="fade-up">
                            <p className="ms-section-label">Dificultad</p>
                            {loading ? (
                                <div className="flex items-center gap-2 mb-6">
                                    {[0, 1, 2].map((i) => (
                                        <span key={i} className="thinking-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--violet)", display: "inline-block" }} />
                                    ))}
                                </div>
                            ) : (
                                <div className="ms-difficulty-list">
                                    {botModes.map((mode) => {
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

                    <div className="fade-up">
                        <p className="ms-section-label">{boardVariant === "tetra3d" ? "Nivel del tetraedro" : "Tamano del tablero"}</p>
                        <div className="ms-size-grid">
                            {boardSizes.map((size) => (
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
                )}

                {/* Tiempo por turno (solo vsBot) */}
                {gameMode === "vsBot" && (
                    <div className="fade-up">
                        <p className="ms-section-label">Tiempo por turno</p>
                        <div className="ms-size-grid">
                            {TIME_LIMITS.map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => setTimeLimit(t.value)}
                                    className={`ms-size-card${timeLimit === t.value ? " selected" : ""}`}
                                >
                                    <div className="ms-size-badge">{t.label}</div>
                                    <div className="ms-size-desc">{t.description}</div>
                                </button>
                            ))}
                        </div>
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
                    <div className="fade-up">
                        <button className="ms-play-btn" onClick={handleStart} disabled={loading}>
                            Jugar →
                        </button>

                    </div>
                </div>

                <div className="ms-decoration fade-up">
                    <div className="ms-decoration-line" />
                    <span className="ms-decoration-text">YOVI</span>
                    <div className="ms-decoration-line" />
                </div>
            </div>
        </div>
    );
};

export default ModeSelector;
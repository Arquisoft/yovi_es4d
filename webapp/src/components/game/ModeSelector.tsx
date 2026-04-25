import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config";
import { useTranslation } from "../../i18n";
import "./game.css";
import UserHeader from "../UserHeader";

const BOT_MODES: Record<string, { key: string; tagClass: string }> = {
    random_bot: { key: "random", tagClass: "text-green-700 bg-green-100 border border-green-300" },
    intermediate_bot: { key: "intermediate", tagClass: "text-yellow-700 bg-yellow-100 border border-yellow-300" },
    hard_bot: { key: "hard", tagClass: "text-red-700 bg-red-100 border border-red-300" },
};

const TIME_LIMITS = [
    { value: 0, key: "unlimited", label: "∞" },
    { value: 15, key: "fast", label: "15s" },
    { value: 30, key: "normal", label: "30s" },
    { value: 60, key: "relaxed", label: "60s" },
];

const LOCAL_MODES: { id: string; key: string }[] = [
    { id: "vsBot", key: "vsBot" },
    { id: "multiplayer", key: "multiplayer" },
];

const BOARD_VARIANTS: { id: "classic" | "tetra3d"; key: string }[] = [
    { id: "classic", key: "classic" },
    { id: "tetra3d", key: "tetra3d" },
];

const CLASSIC_BOARD_SIZES = [
    { value: 8, key: "small", tag: "8×" },
    { value: 11, key: "normal", tag: "11×" },
    { value: 15, key: "large", tag: "15×" },
    { value: 19, key: "extra", tag: "19×" },
];

const TETRA_BOARD_SIZES = [
    { value: 3, key: "base", tag: "T3" },
    { value: 4, key: "normal", tag: "T4" },
    { value: 5, key: "wide", tag: "T5" },
    { value: 6, key: "deep", tag: "T6" },
];

const ModeSelector: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [botModes, setBotModes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameMode, setGameMode] = useState("vsBot");
    const [botMode, setBotMode] = useState("random_bot");
    const [boardVariant, setBoardVariant] = useState<"classic" | "tetra3d">("classic");
    const [boardSize, setBoardSize] = useState(11);
    const [player2Name, setPlayer2Name] = useState("");
    const [timeLimit, setTimeLimit] = useState(0);
    const [startingPlayer, setStartingPlayer] = useState<"j1" | "j2">("j1");

    useEffect(() => {
        fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
            .then((res) => {
                if (!res.ok) {
                    navigate("/login");
                }
            })
            .catch(() => {
                navigate("/login");
            });
    }, [navigate]);

    useEffect(() => {
        fetch(`${API_URL}/api/game/bot-modes`, { credentials: "include" })
            .then((r) => {
                if (!r.ok) throw new Error("Error loading bot modes");
                return r.json();
            })
            .then((data) => {
                const modes: string[] = Array.isArray(data.botModes) && data.botModes.length
                    ? data.botModes
                    : ["random_bot"];
                setBotModes(modes);
                setBotMode(modes[0]);
            })
            .catch(() => {
                setBotModes(["random_bot"]);
                setBotMode("random_bot");
            })
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
                player2Name: player2Name.trim() || t("modeSelector.player2Default"),
                startingPlayer,
            },
        });
    };

    return (
        <div className="game-bg min-h-screen flex flex-col">
            <UserHeader />
            <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
                <div className="ms-header fade-up">
                    <div className="ms-badge"><span>{t("modeSelector.newGame")}</span></div>
                    <h1 className="ms-title">{t("modeSelector.configure")}</h1>
                    <p className="ms-subtitle">{t("modeSelector.chooseHow")}</p>
                </div>

                <div className="ms-body">
                    <div className="fade-up">
                        <p className="ms-section-label">{t("modeSelector.online")}</p>
                        <button className="ms-mode-card" onClick={() => navigate("/online-lobby")}>
                            <span className="ms-mode-emoji">🌐</span>
                            <div className="ms-mode-info">
                                <div className="ms-mode-name-row">
                                    <span className="ms-mode-name">{t("modeSelector.playOnline")}</span>
                                </div>
                                <p className="ms-mode-desc">{t("modeSelector.playOnlineDesc")}</p>
                            </div>
                            <span style={{ color: "var(--violet)", fontSize: "1.1rem" }}>→</span>
                        </button>
                    </div>

                    <div className="fade-up flex items-center gap-3 my-2">
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", letterSpacing: "0.1em" }}>{t("modeSelector.localTitle")}</span>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>

                    <div className="fade-up">
                        <p className="ms-section-label">{t("modeSelector.gameMode")}</p>
                        <div className="ms-difficulty-list ms-local-mode-list">
                            {LOCAL_MODES.map(({ id, key }) => (
                                <button
                                    key={id}
                                    onClick={() => setGameMode(id)}
                                    className={`ms-mode-card${gameMode === id ? " selected" : ""}`}
                                >
                                    <div className="ms-mode-info">
                                        <div className="ms-mode-name-row">
                                            <span className="ms-mode-name">{t(`modeSelector.local.${key}.label`)}</span>
                                        </div>
                                        <p className="ms-mode-desc">{t(`modeSelector.local.${key}.description`)}</p>
                                    </div>
                                    <div className={`ms-radio${gameMode === id ? " checked" : ""}`}>
                                        {gameMode === id && <span className="ms-radio-dot" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {gameMode === "multiplayer" && (
                        <div className="fade-up flex items-center gap-2 rounded-xl px-4 py-3 mb-1" style={{ background: "rgba(255,180,0,0.10)", border: "1px solid rgba(255,180,0,0.35)" }}>
                            <span style={{ fontSize: "1rem" }}>⚠️</span>
                            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                                <strong style={{ color: "var(--text)" }}>{t("modeSelector.multiplayerWarning")}</strong>
                            </p>
                        </div>
                    )}

                    {gameMode === "multiplayer" && (
                        <div className="fade-up rounded-2xl p-5 mb-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                            <div className="flex items-center gap-2 mb-3">
                                <p className="ms-section-label" style={{ margin: 0 }}>{t("modeSelector.player2")}</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    maxLength={20}
                                    placeholder={t("modeSelector.player2Placeholder")}
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
                                {player2Name.trim() && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "var(--coral)" }}>
                                        ✓
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="fade-up">
                        <p className="ms-section-label">{t("modeSelector.boardStructure")}</p>
                        <div className="ms-difficulty-list ms-board-variant-list">
                            {BOARD_VARIANTS.map(({ id, key }) => (
                                <button
                                    key={id}
                                    onClick={() => setBoardVariant(id)}
                                    className={`ms-mode-card${boardVariant === id ? " selected" : ""}`}
                                >
                                    <div className="ms-mode-info">
                                        <div className="ms-mode-name-row">
                                            <span className="ms-mode-name">{t(`modeSelector.variant.${key}.label`)}</span>
                                        </div>
                                        <p className="ms-mode-desc">{t(`modeSelector.variant.${key}.description`)}</p>
                                    </div>
                                    <div className={`ms-radio${boardVariant === id ? " checked" : ""}`}>
                                        {boardVariant === id && <span className="ms-radio-dot" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="fade-up">
                        <p className="ms-section-label">{t("modeSelector.startingTurn")}</p>
                        <div className="ms-difficulty-list ms-starting-player-list">
                            {(gameMode === "vsBot"
                                ? [
                                    { id: "j1", key: "vsBot.j1" },
                                    { id: "j2", key: "vsBot.j2" },
                                ]
                                : [
                                    { id: "j1", key: "multiplayer.j1" },
                                    { id: "j2", key: "multiplayer.j2" },
                                ]).map(({ id, key }) => (
                                <button
                                    key={id}
                                    onClick={() => setStartingPlayer(id as "j1" | "j2")}
                                    className={`ms-mode-card${startingPlayer === id ? " selected" : ""}`}
                                >
                                    <div className="ms-mode-info">
                                        <div className="ms-mode-name-row">
                                            <span className="ms-mode-name">{t(`modeSelector.startingPlayer.${key}.label`)}</span>
                                        </div>
                                        <p className="ms-mode-desc">{t(`modeSelector.startingPlayer.${key}.description`)}</p>
                                    </div>
                                    <div className={`ms-radio${startingPlayer === id ? " checked" : ""}`}>
                                        {startingPlayer === id && <span className="ms-radio-dot" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {gameMode === "vsBot" && (
                        <div className="fade-up">
                            <p className="ms-section-label">{t("modeSelector.difficulty")}</p>
                            {loading ? (
                                <div className="flex items-center gap-2 mb-6">
                                    {[0, 1, 2].map((i) => (
                                        <span key={i} className="thinking-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--violet)", display: "inline-block" }} />
                                    ))}
                                </div>
                            ) : (
                                <div className="ms-difficulty-list ms-bot-difficulty-list">
                                    {botModes.map((mode) => {
                                        const meta = BOT_MODES[mode];
                                        const botKey = meta?.key;
                                        return (
                                            <button
                                                key={mode}
                                                onClick={() => setBotMode(mode)}
                                                className={`ms-mode-card${botMode === mode ? " selected" : ""}`}
                                            >
                                                <div className="ms-mode-info">
                                                    <div className="ms-mode-name-row">
                                                        <span className="ms-mode-name">{botKey ? t(`modeSelector.bot.${botKey}.label`) : mode}</span>
                                                        {botKey && (
                                                            <span className={`ms-tag ${meta.tagClass}`}>{t(`modeSelector.bot.${botKey}.tag`)}</span>
                                                        )}
                                                    </div>
                                                    <p className="ms-mode-desc">{botKey ? t(`modeSelector.bot.${botKey}.description`) : mode}</p>
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

                    {gameMode === "vsBot" && (
                        <div className="fade-up">
                            <p className="ms-section-label">{t("modeSelector.timePerTurn")}</p>
                            <div className="ms-size-grid">
                                {TIME_LIMITS.map((limit) => (
                                    <button
                                        key={limit.value}
                                        onClick={() => setTimeLimit(limit.value)}
                                        className={`ms-size-card${timeLimit === limit.value ? " selected" : ""}`}
                                    >
                                        <div className="ms-size-badge">{limit.label}</div>
                                        <div className="ms-size-desc">{t(`modeSelector.timeLimits.${limit.key}`)}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="fade-up">
                        <p className="ms-section-label">{boardVariant === "tetra3d" ? t("modeSelector.tetraLevel") : t("modeSelector.boardSize")}</p>
                        <div className="ms-size-grid">
                            {boardSizes.map((size) => (
                                <button
                                    key={size.value}
                                    onClick={() => setBoardSize(size.value)}
                                    className={`ms-size-card${boardSize === size.value ? " selected" : ""}`}
                                >
                                    <div className="ms-size-badge">{size.tag}</div>
                                    <div className="ms-size-label">{t(`modeSelector.${boardVariant === "tetra3d" ? "tetraBoard" : "board"}.${size.key}.label`)}</div>
                                    <div className="ms-size-desc">{t(`modeSelector.${boardVariant === "tetra3d" ? "tetraBoard" : "board"}.${size.key}.description`)}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="fade-up">
                        <button className="ms-play-btn" onClick={handleStart} disabled={loading}>
                            {t("modeSelector.play")} →
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

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config";
import "./game.css";
import UserHeader from "../UserHeader";
import { useTranslation } from "../../i18n";

const ModeSelector: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const BOT_MODES: Record<string, any> = {
        random_bot: {
            label: t("modeSelector.bot.random.label"),
            description: t("modeSelector.bot.random.description"),
            tagLabel: t("modeSelector.bot.random.tag"),
            tagClass: "text-green-700 bg-green-100 border border-green-300"
        },
        intermediate_bot: {
            label: t("modeSelector.bot.intermediate.label"),
            description: t("modeSelector.bot.intermediate.description"),
            tagLabel: t("modeSelector.bot.intermediate.tag"),
            tagClass: "text-yellow-700 bg-yellow-100 border border-yellow-300"
        },
        hard_bot: {
            label: t("modeSelector.bot.hard.label"),
            description: t("modeSelector.bot.hard.description"),
            tagLabel: t("modeSelector.bot.hard.tag"),
            tagClass: "text-red-700 bg-red-100 border border-red-300"
        },
    };

    const BOARD_SIZES = [
        {
            value: 8,
            label: t("modeSelector.board.small.label"),
            description: t("modeSelector.board.small.description"),
            tag: "8×"
        },
        {
            value: 11,
            label: t("modeSelector.board.normal.label"),
            description: t("modeSelector.board.normal.description"),
            tag: "11×"
        },
        {
            value: 15,
            label: t("modeSelector.board.large.label"),
            description: t("modeSelector.board.large.description"),
            tag: "15×"
        },
        {
            value: 19,
            label: t("modeSelector.board.extra.label"),
            description: t("modeSelector.board.extra.description"),
            tag: "19×"
        },
    ];

    const LOCAL_MODES = [
        {
            id: "vsBot",
            label: t("modeSelector.local.vsBot.label"),
            description: t("modeSelector.local.vsBot.description")
        },
        {
            id: "multiplayer",
            label: t("modeSelector.local.multiplayer.label"),
            description: t("modeSelector.local.multiplayer.description")
        },
    ];

    const [botModes, setBotModes] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameMode, setGameMode] = useState("vsBot");
    const [botMode, setBotMode] = useState("random_bot");
    const [boardSize, setBoardSize] = useState(11);
    const [player2Name, setPlayer2Name] = useState("");

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
        navigate("/game", {
            state: {
                gameMode,
                botMode,
                boardSize,
                player2Name: player2Name.trim() || t("modeSelector.player2Default")
            }
        });
    };

    return (
        <div className="game-bg min-h-screen flex flex-col">
            <UserHeader />

            <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">

                {/* HEADER */}
                <div className="ms-header fade-up">
                    <div className="ms-badge">
                        <span>{t("modeSelector.newGame")}</span>
                    </div>

                    <h1 className="ms-title">
                        {t("modeSelector.configure")}
                    </h1>

                    <p className="ms-subtitle">
                        {t("modeSelector.chooseHow")}
                    </p>
                </div>

                <div className="ms-body">

                    {/* ONLINE */}
                    <div className="fade-up">
                        <p className="ms-section-label">
                            {t("modeSelector.online")}
                        </p>

                        <button
                            className="ms-mode-card"
                            onClick={() => navigate("/online-lobby")}
                        >
                            <span className="ms-mode-emoji">🌐</span>

                            <div className="ms-mode-info">
                                <div className="ms-mode-name-row">
                                    <span className="ms-mode-name">
                                        {t("modeSelector.playOnline")}
                                    </span>
                                </div>

                                <p className="ms-mode-desc">
                                    {t("modeSelector.playOnlineDesc")}
                                </p>
                            </div>

                            <span style={{ color: "var(--violet)", fontSize: "1.1rem" }}>
                                →
                            </span>
                        </button>
                    </div>

                    {/* LOCAL */}
                    <div className="fade-up flex items-center gap-3 my-2">
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                            {t("modeSelector.localTitle")}
                        </span>
                        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    </div>

                    {/* GAME MODE */}
                    <div className="fade-up">
                        <p className="ms-section-label">
                            {t("modeSelector.gameMode")}
                        </p>

                        <div className="ms-difficulty-list">
                            {LOCAL_MODES.map(({ id, label, description }) => (
                                <button
                                    key={id}
                                    onClick={() => setGameMode(id)}
                                    className={`ms-mode-card${gameMode === id ? " selected" : ""}`}
                                >
                                    <div className="ms-mode-info">
                                        <span className="ms-mode-name">{label}</span>
                                        <p className="ms-mode-desc">{description}</p>
                                    </div>

                                    <div className={`ms-radio${gameMode === id ? " checked" : ""}`}>
                                        {gameMode === id && <span className="ms-radio-dot" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* PLAYER 2 NAME */}
                    {gameMode === "multiplayer" && (
                        <div className="fade-up rounded-2xl p-5 mb-2"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

                            <p className="ms-section-label">
                                {t("modeSelector.player2")}
                            </p>

                            <input
                                type="text"
                                maxLength={20}
                                placeholder={t("modeSelector.player2Placeholder")}
                                value={player2Name}
                                onChange={e => setPlayer2Name(e.target.value)}
                                className="w-full rounded-xl px-4 py-3 outline-none"
                            />
                        </div>
                    )}

                    {/* BOT DIFFICULTY */}
                    {gameMode === "vsBot" && (
                        <div className="fade-up">
                            <p className="ms-section-label">
                                {t("modeSelector.difficulty")}
                            </p>

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
                                                <span className="ms-mode-name">
                                                    {meta?.label ?? mode}
                                                </span>
                                                <p className="ms-mode-desc">
                                                    {meta?.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* BOARD SIZE */}
                    <div className="fade-up">
                        <p className="ms-section-label">
                            {t("modeSelector.boardSize")}
                        </p>

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

                    {/* PLAY BUTTON */}
                    <div className="fade-up">
                        <button className="ms-play-btn" onClick={handleStart} disabled={loading}>
                            {t("modeSelector.play")} →
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ModeSelector;
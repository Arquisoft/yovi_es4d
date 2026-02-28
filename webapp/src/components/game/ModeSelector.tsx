import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config";
import "./game.css";

const BOT_MODE_META: Record<string, { label: string; description: string; tag: string; emoji: string }> = {
  random_bot:       { label: "Aleatorio",  description: "El bot sigue ninguna estratégia, se comporta de manera aleatoria.", tag: "Fácil",  emoji: "" },
  intermediate_bot: { label: "Intermedio", description: "El bot evalúa el tablero y busca las mejores jugadas.",        tag: "Medio",  emoji: "" },
};

const TAG_STYLE: Record<string, React.CSSProperties> = {
  "Fácil":   { color: "#166534", background: "#dcfce7", border: "1px solid #86efac" },
  "Medio":   { color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d" },
  "Difícil": { color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5" },
};

const ModeSelector: React.FC = () => {
  const navigate = useNavigate();
  const [availableBotModes, setAvailableBotModes] = useState<string[]>([]);
  const [selectedBotMode, setSelectedBotMode]     = useState<string>("random_bot");
  const [loading, setLoading]                     = useState(true);

  useEffect(() => {
    const fetchBotModes = async () => {
      try {
        const res  = await fetch(`${API_URL}/api/game/bot-modes`);
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

  const handleStart = () =>
      navigate("/game", { state: { gameMode: "vsBot", botMode: selectedBotMode } });

  return (
      <div
          className="game-bg min-h-screen flex flex-col items-center justify-center px-6 py-16"
          style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {/* Cabecera */}
        <div className="fade-up text-center mb-10">
          <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
              style={{ background: "#fff", border: "1px solid #e8e2d9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.25em", color: "#7c6ff7", textTransform: "uppercase" }}>
            Nueva partida
          </span>
          </div>
          <h1 style={{ fontSize: "2.8rem", fontWeight: 800, color: "#2d2a26", lineHeight: 1.15, margin: "0 0 8px" }}>
            Elige la dificultad
          </h1>
          <p style={{ color: "#9e9890", fontSize: "1rem", margin: 0 }}>
            Selecciona el nivel de dificultad del bot
          </p>
        </div>

        {/* Cards */}
        {loading ? (
            <div className="flex items-center gap-2 mb-10">
              {[0,1,2].map(i => <span key={i} className="thinking-dot w-2.5 h-2.5 rounded-full" style={{ background: "#7c6ff7" }} />)}
            </div>
        ) : (
            <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {availableBotModes.map((mode, i) => {
                const meta       = BOT_MODE_META[mode];
                const isSelected = selectedBotMode === mode;

                return (
                    <button
                        key={mode}
                        onClick={() => setSelectedBotMode(mode)}
                        className="fade-up"
                        style={{
                          animationDelay: `${i * 100 + 150}ms`,
                          width: "100%",
                          textAlign: "left",
                          padding: "16px 20px",
                          borderRadius: 16,
                          border: isSelected ? "2px solid #7c6ff7" : "2px solid #e8e2d9",
                          background: "#ffffff",
                          boxShadow: isSelected
                              ? "0 4px 24px rgba(124,111,247,0.18)"
                              : "0 1px 4px rgba(0,0,0,0.05)",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                        }}
                    >
                      {/* Emoji */}
                      <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{meta?.emoji ?? "🤖"}</span>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: isSelected ? "#7c6ff7" : "#2d2a26",
                    }}>
                      {meta?.label ?? mode}
                    </span>
                          {meta?.tag && (
                              <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "2px 10px",
                                borderRadius: 999,
                                fontFamily: "'DM Mono', monospace",
                                ...(TAG_STYLE[meta.tag] ?? { color: "#9e9890", background: "#f0ece4", border: "1px solid #e8e2d9" }),
                              }}>
                        {meta.tag}
                      </span>
                          )}
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "#9e9890", margin: 0, lineHeight: 1.5 }}>
                          {meta?.description}
                        </p>
                      </div>

                      {/* Radio */}
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: isSelected ? "2px solid #7c6ff7" : "2px solid #d6cfc4",
                        background: isSelected ? "#7c6ff7" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.2s ease",
                      }}>
                        {isSelected && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "block" }} />}
                      </div>
                    </button>
                );
              })}
            </div>
        )}

        {/* Botón Jugar */}
        <div className="fade-up" style={{ width: "100%", maxWidth: 440, animationDelay: "400ms" }}>
          <button
              onClick={handleStart}
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 16,
                border: "none",
                background: loading ? "#c4bdf8" : "#7c6ff7",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 20px rgba(124,111,247,0.35)",
                transition: "all 0.15s ease",
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#6a5ee8"; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#7c6ff7"; }}
          >
            Jugar →
          </button>
        </div>

        {/* Decoración */}
        <div className="fade-up mt-12 flex items-center gap-3" style={{ animationDelay: "500ms" }}>
          <div style={{ width: 32, height: 1, background: "#e8e2d9" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#c4bdb4", letterSpacing: "0.3em" }}>YEN</span>
          <div style={{ width: 32, height: 1, background: "#e8e2d9" }} />
        </div>
      </div>
  );
};

export default ModeSelector;
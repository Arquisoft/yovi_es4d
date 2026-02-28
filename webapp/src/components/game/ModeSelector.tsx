import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config";
import "./ModeSelector.css";

const BOT_MODE_LABELS: Record<string, string> = {
  random_bot:       "Aleatorio",
  intermediate_bot: "Intermedio",
  // hard_bot:      "Difícil",
};

const ModeSelector: React.FC = () => {
  const navigate = useNavigate();
  const [availableBotModes, setAvailableBotModes] = useState<string[]>([]);
  const [selectedBotMode, setSelectedBotMode] = useState<string>("random_bot");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBotModes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/game/bot-modes`);
        const data = await res.json();
        const modes: string[] = data.botModes ?? [];
        setAvailableBotModes(modes);
        if (modes.length > 0) setSelectedBotMode(modes[0]);
      } catch (error) {
        console.error("Error fetching bot modes:", error);
        setAvailableBotModes(["random_bot"]);
      } finally {
        setLoading(false);
      }
    };
    fetchBotModes();
  }, []);

  const handleStart = () => {
    navigate("/game", {
      state: {
        gameMode: "vsBot",
        botMode: selectedBotMode,
      },
    });
  };

  return (
    <div className="mode-selector-container">
      <h1 className="mode-selector-title">Elige tu rival</h1>

      {loading ? (
        <p className="mode-selector-loading">Cargando modos...</p>
      ) : (
        <div className="bot-mode-selector">
          {availableBotModes.map(mode => (
            <button
              key={mode}
              className={`bot-mode-btn ${selectedBotMode === mode ? "selected" : ""}`}
              onClick={() => setSelectedBotMode(mode)}
            >
              {BOT_MODE_LABELS[mode] ?? mode}
            </button>
          ))}
        </div>
      )}

      <button
        className="start-btn"
        onClick={handleStart}
        disabled={loading}
      >
        ¡Jugar!
      </button>
    </div>
  );
};

export default ModeSelector;

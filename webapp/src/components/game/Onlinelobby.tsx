import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../../config";
import { useTranslation } from "../../i18n";
import "./game.css";
import UserHeader from "../UserHeader";

type LobbyState = "idle" | "creating" | "waiting" | "joining" | "ready";

const BOARD_SIZES = [
  { value: 8, tag: "8×", key: "small" },
  { value: 11, tag: "11×", key: "normal" },
  { value: 15, tag: "15×", key: "large" },
  { value: 19, tag: "19×", key: "extra" },
];

const OnlineLobby: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState>("idle");
  const [roomCode, setRoomCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [boardSize, setBoardSize] = useState<number>(11);
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
    const s = io(API_URL, { withCredentials: true });
    setSocket(s);

    s.on("room_created", ({ code }: { code: string }) => {
      setRoomCode(code);
      setLobbyState("waiting");
    });

    s.on("your_role", ({ role, code, boardSize: bs, startingPlayer: sp }: { role: string; code: string; boardSize: number; startingPlayer: "j1" | "j2" }) => {
      setLobbyState("ready");
      navigate("/game", {
        state: {
          gameMode: "online",
          boardSize: bs,
          onlineRole: role,
          roomCode: code,
          socketId: s.id,
          startingPlayer: sp,
        },
      });
    });

    s.on("room_error", ({ message }: { message: string }) => {
      setError(message);
      setLobbyState("idle");
    });

    return () => {
      s.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = () => {
    if (!socket) return;
    setError("");
    setLobbyState("creating");
    socket.emit("create_room", { boardSize, startingPlayer });
  };

  const handleJoin = () => {
    if (!socket || !inputCode.trim()) return;
    setError("");
    setLobbyState("joining");
    socket.emit("join_room", { code: inputCode.trim().toUpperCase() });
  };

  return (
    <div className="game-bg min-h-screen flex flex-col">
      <UserHeader />
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
        <div className="ms-header fade-up">
          <div className="ms-badge"><span>{t("onlineLobby.badge")}</span></div>
          <h1 className="ms-title">{t("onlineLobby.title")}</h1>
          <p className="ms-subtitle">{t("onlineLobby.subtitle")}</p>
        </div>

        {lobbyState === "idle" && (
          <div className="fade-up w-full max-w-3xl">
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-5 rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-base" style={{ color: "var(--text)" }}>
                    {t("onlineLobby.createRoom")}
                  </h2>
                </div>

                <div>
                  <p className="ms-section-label mb-3">{t("onlineLobby.boardSize")}</p>
                  <div className="ms-size-grid">
                    {BOARD_SIZES.map((size) => (
                      <button
                        key={size.value}
                        onClick={() => setBoardSize(size.value)}
                        className={`ms-size-card${boardSize === size.value ? " selected" : ""}`}
                      >
                        <div className="ms-size-badge">{size.tag}</div>
                        <div className="ms-size-label">{t(`modeSelector.board.${size.key}.label`)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="ms-section-label mb-3">{t("onlineLobby.startingTurn")}</p>
                  <div className="ms-difficulty-list">
                    {[
                      { id: "j1", key: "j1" },
                      { id: "j2", key: "j2" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setStartingPlayer(opt.id as "j1" | "j2")}
                        className={`ms-mode-card${startingPlayer === opt.id ? " selected" : ""}`}
                      >
                        <div className="ms-mode-info">
                          <div className="ms-mode-name-row">
                            <span className="ms-mode-name">{t(`onlineLobby.startingPlayer.${opt.key}.label`)}</span>
                          </div>
                          <p className="ms-mode-desc">{t(`onlineLobby.startingPlayer.${opt.key}.description`)}</p>
                        </div>
                        <div className={`ms-radio${startingPlayer === opt.id ? " checked" : ""}`}>
                          {startingPlayer === opt.id && <span className="ms-radio-dot" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button className="ms-play-btn mt-auto" onClick={handleCreate}>
                  {t("onlineLobby.createRoom")}
                </button>
              </div>

              <div className="hidden md:flex items-center justify-center absolute left-1/2 top-0 bottom-0 -translate-x-1/2 pointer-events-none">
                <div style={{ width: 1, height: "100%", background: "var(--border)" }} />
              </div>

              <div className="flex flex-col gap-5 rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-base" style={{ color: "var(--text)" }}>
                    {t("onlineLobby.joinRoom")}
                  </h2>
                </div>

                <p className="text-sm" style={{ color: "var(--subtle)" }}>
                  {t("onlineLobby.joinHelp")}
                </p>

                <div className="flex flex-col gap-3 mt-auto">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder={t("onlineLobby.codePlaceholder")}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="w-full text-center text-2xl font-bold tracking-widest rounded-xl px-4 py-4 outline-none transition-all"
                    style={{
                      background: "var(--bg)",
                      border: `2px solid ${inputCode.length === 4 ? "var(--violet)" : "var(--border)"}`,
                      color: "var(--text)",
                      letterSpacing: "0.4em",
                    }}
                  />
                  <button
                    className="ms-play-btn"
                    onClick={handleJoin}
                    disabled={inputCode.length < 4}
                    style={inputCode.length < 4 ? {} : { background: "var(--coral)" }}
                  >
                    {t("onlineLobby.join")}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-center mt-4 text-sm" style={{ color: "var(--coral)" }}>{error}</p>
            )}

            <div className="text-center mt-6">
              <button
                onClick={() => navigate("/select")}
                className="text-sm transition-opacity hover:opacity-70"
                style={{ background: "none", border: "none", color: "var(--subtle)", cursor: "pointer" }}
              >
                ← {t("common.back")}
              </button>
            </div>
          </div>
        )}

        {lobbyState === "waiting" && (
          <div className="fade-up w-full max-w-sm">
            <div className="rounded-2xl p-8 flex flex-col items-center gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="ms-section-label">{t("onlineLobby.shareCode")}</p>

              <div
                className="rounded-xl px-8 py-4 tracking-widest font-bold text-5xl"
                style={{
                  background: "var(--bg)",
                  border: "2px solid var(--violet)",
                  color: "var(--violet)",
                  letterSpacing: "0.4em",
                }}
              >
                {roomCode}
              </div>

              <div className="flex gap-1 mt-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="thinking-dot"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--violet)",
                      display: "inline-block",
                    }}
                  />
                ))}
              </div>

              <p className="text-sm text-center" style={{ color: "var(--subtle)" }}>
                {t("onlineLobby.waitingFriend")}
              </p>

              <button
                onClick={() => navigate("/select")}
                className="text-sm mt-2 transition-opacity hover:opacity-70"
                style={{ background: "none", border: "none", color: "var(--subtle)", cursor: "pointer" }}
              >
                ← {t("onlineLobby.cancel")}
              </button>
            </div>
          </div>
        )}

        {lobbyState === "joining" && (
          <div className="fade-up" style={{ textAlign: "center" }}>
            <p style={{ color: "var(--subtle)" }}>{t("onlineLobby.joiningRoom")} <strong style={{ color: "var(--violet)" }}>{inputCode}</strong>...</p>
          </div>
        )}

        {lobbyState === "ready" && (
          <div className="fade-up" style={{ textAlign: "center" }}>
            <p style={{ color: "var(--violet)" }}>{t("onlineLobby.readyLoading")}</p>
          </div>
        )}

        <div className="ms-decoration fade-up mt-8">
          <div className="ms-decoration-line" />
          <span className="ms-decoration-text">YOVI</span>
          <div className="ms-decoration-line" />
        </div>
      </div>
    </div>
  );
};

export default OnlineLobby;

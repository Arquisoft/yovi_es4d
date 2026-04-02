import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../../config";
import "./game.css";

type LobbyState = "idle" | "creating" | "waiting" | "joining" | "ready";

const BOARD_SIZES = [
  { value: 8,  tag: "8×",  label: "Pequeño" },
  { value: 11, tag: "11×", label: "Normal"  },
  { value: 15, tag: "15×", label: "Grande"  },
  { value: 19, tag: "19×", label: "Extra"   },
];

const OnlineLobby: React.FC = () => {
  const navigate = useNavigate();

  const [socket, setSocket]         = useState<Socket | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState>("idle");
  const [roomCode, setRoomCode]     = useState<string>("");
  const [inputCode, setInputCode]   = useState<string>("");
  const [error, setError]           = useState<string>("");
  const [boardSize, setBoardSize]   = useState<number>(11);

  useEffect(() => {
    const s = io(API_URL, { withCredentials: true });
    setSocket(s);

    s.on('room_created', ({ code }: { code: string }) => {
      setRoomCode(code);
      setLobbyState("waiting");
    });

    s.on('your_role', ({ role, code, boardSize: bs }: { role: string; code: string; boardSize: number }) => {
      setLobbyState("ready");
      navigate("/game", {
        state: {
          gameMode:  "online",
          boardSize: bs,
          onlineRole: role,
          roomCode:  code,
          socketId:  s.id,
        },
      });
    });

    s.on('room_error', ({ message }: { message: string }) => {
      setError(message);
      setLobbyState("idle");
    });

    return () => { s.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = () => {
    if (!socket) return;
    setError("");
    setLobbyState("creating");
    socket.emit('create_room', { boardSize });
  };

  const handleJoin = () => {
    if (!socket || !inputCode.trim()) return;
    setError("");
    setLobbyState("joining");
    socket.emit('join_room', { code: inputCode.trim().toUpperCase() });
  };

  return (
    <div className="game-bg min-h-screen flex flex-col items-center justify-center px-6 py-16">

      {/* ── Cabecera ── */}
      <div className="ms-header fade-up">
        <div className="ms-badge"><span>Partida online</span></div>
        <h1 className="ms-title">Jugar online</h1>
        <p className="ms-subtitle">Crea una sala o únete con un código</p>
      </div>

      {/* ── Estado idle: dos paneles ── */}
      {lobbyState === "idle" && (
        <div className="fade-up w-full max-w-3xl">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Panel Crear */}
            <div className="flex flex-col gap-5 rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

              <div className="flex items-center gap-2">
                <span className="text-lg" style={{ color: "var(--violet)" }}>◈</span>
                <h2 className="font-semibold text-base" style={{ color: "var(--text)" }}>
                  Crear sala
                </h2>
              </div>

              <div>
                <p className="ms-section-label mb-3">Tamaño del tablero</p>
                <div className="ms-size-grid">
                  {BOARD_SIZES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setBoardSize(s.value)}
                      className={`ms-size-card${boardSize === s.value ? " selected" : ""}`}
                    >
                      <div className="ms-size-badge">{s.tag}</div>
                      <div className="ms-size-label">{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button className="ms-play-btn mt-auto" onClick={handleCreate}>
                Crear sala
              </button>
            </div>

            {/* Divisor vertical solo en md+ */}
            <div className="hidden md:flex items-center justify-center absolute left-1/2 top-0 bottom-0 -translate-x-1/2 pointer-events-none">
              <div style={{ width: 1, height: "100%", background: "var(--border)" }} />
            </div>

            {/* Panel Unirse */}
            <div className="flex flex-col gap-5 rounded-2xl p-6"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

              <div className="flex items-center gap-2">
                <span className="text-lg" style={{ color: "var(--coral)" }}>◈</span>
                <h2 className="font-semibold text-base" style={{ color: "var(--text)" }}>
                  Unirse a sala
                </h2>
              </div>

              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Introduce el código de 4 letras que te ha compartido tu amigo.
              </p>

              <div className="flex flex-col gap-3 mt-auto">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Ej: XKQZ"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.toUpperCase())}
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
                  Unirse
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
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              ← Volver
            </button>
          </div>
        </div>
      )}

      {/* ── Esperando rival ── */}
      {lobbyState === "waiting" && (
        <div className="fade-up w-full max-w-sm">
          <div className="rounded-2xl p-8 flex flex-col items-center gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

            <p className="ms-section-label">Comparte este código</p>

            <div className="rounded-xl px-8 py-4 tracking-widest font-bold text-5xl"
              style={{
                background: "var(--bg)",
                border: "2px solid var(--violet)",
                color: "var(--violet)",
                letterSpacing: "0.4em",
              }}>
              {roomCode}
            </div>

            <div className="flex gap-1 mt-1">
              {[0,1,2].map(i => (
                <span key={i} className="thinking-dot" style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--violet)", display: "inline-block"
                }} />
              ))}
            </div>

            <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
              Esperando a que tu amigo se una...
            </p>

            <button
              onClick={() => navigate("/select")}
              className="text-sm mt-2 transition-opacity hover:opacity-70"
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              ← Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Uniéndose ── */}
      {lobbyState === "joining" && (
        <div className="fade-up" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)" }}>Uniéndose a la sala <strong style={{ color: "var(--violet)" }}>{inputCode}</strong>...</p>
        </div>
      )}

      {/* ── Listo ── */}
      {lobbyState === "ready" && (
        <div className="fade-up" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--violet)" }}>¡Partida lista! Cargando...</p>
        </div>
      )}

      <div className="ms-decoration fade-up mt-8">
        <div className="ms-decoration-line" />
        <span className="ms-decoration-text">YOVI</span>
        <div className="ms-decoration-line" />
      </div>
    </div>
  );
};

export default OnlineLobby;

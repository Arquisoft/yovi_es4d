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

  // Conectar socket al montar
  useEffect(() => {
    const s = io(API_URL, { withCredentials: true });
    setSocket(s);

    s.on('room_created', ({ code }: { code: string }) => {
      setRoomCode(code);
      setLobbyState("waiting");
    });

    s.on('your_role', ({ role, code, boardSize: bs }: { role: string; code: string; boardSize: number }) => {
      setLobbyState("ready");
      // Navegar al juego con el rol asignado
      navigate("/game", {
        state: {
          gameMode:  "online",
          boardSize: bs,
          onlineRole: role,   // 'j1' o 'j2'
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

      <div className="ms-header fade-up">
        <div className="ms-badge"><span>Partida online</span></div>
        <h1 className="ms-title">Jugar online</h1>
        <p className="ms-subtitle">Crea una sala o únete con un código</p>
      </div>

      <div className="ms-body">

        {/* ── Tamaño (solo al crear) ── */}
        {lobbyState === "idle" && (
          <div className="fade-up">
            <p className="ms-section-label">Tamaño del tablero</p>
            <div className="ms-size-grid">
              {BOARD_SIZES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setBoardSize(s.value)}
                  className={`ms-size-card fade-up${boardSize === s.value ? " selected" : ""}`}
                >
                  <div className="ms-size-badge">{s.tag}</div>
                  <div className="ms-size-label">{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Acciones ── */}
        {lobbyState === "idle" && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            <button className="ms-play-btn" onClick={handleCreate}>
              Crear sala
            </button>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="text"
                maxLength={4}
                placeholder="Código (ej: XKQZ)"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: "1rem",
                  letterSpacing: "0.2em",
                  textAlign: "center",
                }}
              />
              <button
                className="ms-play-btn"
                style={{ flex: "none", padding: "0.75rem 1.5rem" }}
                onClick={handleJoin}
                disabled={inputCode.length < 4}
              >
                Unirse
              </button>
            </div>

            {error && (
              <p style={{ color: "var(--coral)", textAlign: "center", margin: 0 }}>{error}</p>
            )}
          </div>
        )}

        {/* ── Esperando rival ── */}
        {lobbyState === "waiting" && (
          <div className="fade-up" style={{ textAlign: "center" }}>
            <p className="ms-section-label">Comparte este código con tu amigo</p>
            <div style={{
              fontSize: "3rem",
              fontWeight: 700,
              letterSpacing: "0.4em",
              color: "var(--violet)",
              margin: "1rem 0",
            }}>
              {roomCode}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.5rem" }}>
              {[0,1,2].map(i => (
                <span key={i} className="thinking-dot" style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--violet)", display: "inline-block"
                }} />
              ))}
            </div>
            <p style={{ color: "var(--text-muted)", marginTop: "0.75rem" }}>
              Esperando a que tu amigo se una...
            </p>
          </div>
        )}

        {/* ── Uniéndose ── */}
        {lobbyState === "joining" && (
          <div className="fade-up" style={{ textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)" }}>Uniéndose a la sala {inputCode}...</p>
          </div>
        )}

        {/* ── Listo ── */}
        {lobbyState === "ready" && (
          <div className="fade-up" style={{ textAlign: "center" }}>
            <p style={{ color: "var(--violet)" }}>¡Partida lista! Cargando...</p>
          </div>
        )}

        {/* Volver */}
        {(lobbyState === "idle" || lobbyState === "waiting") && (
          <div className="fade-up" style={{ textAlign: "center", marginTop: "1rem" }}>
            <button
              onClick={() => navigate("/select")}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.9rem" }}
            >
              ← Volver
            </button>
          </div>
        )}
      </div>

      <div className="ms-decoration fade-up">
        <div className="ms-decoration-line" />
        <span className="ms-decoration-text">YOVI</span>
        <div className="ms-decoration-line" />
      </div>
    </div>
  );
};

export default OnlineLobby;
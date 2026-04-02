import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Triangle from "./Triangle";
import Jugador from "./player";
import { API_URL } from "../../config";
import "./game.css";
import { useTranslation } from "../../i18n";
import { io, Socket } from "socket.io-client";

interface HexData {
  position: string;
  player: "j1" | "j2" | null;
}

interface PlayerData {
  id: string;
  name: string;
  points: number;
}

interface GameState {
  gameId: string | null;
  hexData: HexData[];
  players: PlayerData[];
  turn: "j1" | "j2" | null;
  status: "active" | "finished" | null;
  winner: "j1" | "j2" | null;
  botPlaying: boolean;
}

interface LocationState {
  gameMode?:   string;
  botMode?:    string;
  boardSize?:  number;
  onlineRole?: string;  // 'j1' | 'j2' — asignado por el servidor en modo online
  roomCode?:   string;
}

const GameBoard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();


  const {
    gameMode   = "vsBot",
    botMode    = "random_bot",
    boardSize  = 11,
    onlineRole = "j1",
    roomCode   = "",
  } = (location.state as LocationState) ?? {};

  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile]         = useState<{ username: string; avatar: string } | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<{ username: string; avatar: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    gameId: null,
    hexData: [],
    players: [],
    turn: null,
    status: null,
    winner: null,
    botPlaying: false,
  });

  useEffect(() => {
    if (gameState.status === "finished") {
      navigate("/gameover", { state: { ...gameState, userProfile, opponentProfile, gameMode, onlineRole } });
    }
  }, [gameState.status, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket online ────────────────────────────────────────
  useEffect(() => {
    if (gameMode !== "online") return;

    const s = io(API_URL, { withCredentials: true });
    socketRef.current = s;

    // Reconectarse a la sala con el nuevo socket del GameBoard
    s.on('connect', () => {
      s.emit('rejoin_room', { code: roomCode, role: onlineRole });
    });

    // Recibir perfil del rival
    s.on('opponent_info', ({ name, avatar }: { name: string; avatar: string }) => {
      setOpponentProfile({ username: name, avatar });
    });

    // j2: recibir gameId cuando j1 inicia la partida
    s.on('game_joined', async ({ gameId }: { gameId: string }) => {
      try {
        const res = await fetch(`${API_URL}/api/game/${gameId}`, { credentials: "include" });
        const data = await res.json();
        setGameState({
          gameId:     data.gameId,
          hexData:    data.board,
          players:    data.players.map((p: PlayerData) => ({ ...p, points: 0 })),
          turn:       data.turn   || "j1",
          status:     data.status || "active",
          winner:     data.winner || null,
          botPlaying: false,
        });
      } catch (err) {
        console.error("Error cargando partida para j2:", err);
      }
    });

    // Recibir movimiento del rival
    s.on('opponent_move', ({ position, turn }: { position: string; turn: string }) => {
      setGameState(prev => ({
        ...prev,
        hexData: prev.hexData.map(h =>
          h.position === position
            ? { ...h, player: (onlineRole === "j1" ? "j2" : "j1") as "j1" | "j2" }
            : h
        ),
        turn: turn as "j1" | "j2",
        botPlaying: false,
      }));
    });

    s.on('opponent_disconnected', () => {
      alert("Tu rival se ha desconectado");
      navigate("/select");
    });

    s.on('game_over', ({ winner }: { winner: string }) => {
      setGameState(prev => ({ ...prev, winner: winner as "j1" | "j2", status: "finished" }));
    });

    return () => { s.disconnect(); };
  }, [gameMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const startGame = async () => {
      try {
        // 1. Obtener userId real del JWT
        const meRes = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
        });
        if (!meRes.ok) {
          navigate("/login");
          return;
        }
        const meData = await meRes.json();
        const resolvedUserId = meData.userId;
        setUserId(resolvedUserId);

        // Obtener nombre e imagen del usuario logueado
        const profileRes = await fetch(`${API_URL}/api/user/getUserProfile`, {
          method: "POST",
          credentials: "include",
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserProfile({ username: profileData.username, avatar: profileData.avatar });
          // Compartir perfil con el rival en modo online
          if (gameMode === "online") {
            socketRef.current?.emit('player_info', {
              code: roomCode,
              name: profileData.username,
              avatar: profileData.avatar,
            });
          }
        }

        // j2 en modo online no crea partida: espera el evento 'game_joined'
        if (gameMode === "online" && onlineRole === "j2") return;

        // 2. Iniciar partida con el userId real
        const res = await fetch(`${API_URL}/api/game/start`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: resolvedUserId, gameMode, botMode, boardSize }),
        });
        const data = await res.json();

        if (!res.ok || !data.players) {
          console.error("Error en respuesta de start:", data);
          return;
        }

        setGameState({
          gameId:     data.gameId,
          hexData:    data.board,
          players:    data.players.map((p: PlayerData) => ({ ...p, points: 0 })),
          turn:       data.turn   || "j1",
          status:     data.status || "active",
          winner:     data.winner || null,
          botPlaying: false,
        });

        // En modo online, j1 notifica al servidor con el gameId para que j2 pueda unirse
        if (gameMode === "online") {
          socketRef.current?.emit('game_started', { code: roomCode, gameId: data.gameId });
        }
      } catch (error) {
        console.error("Error starting game:", error);
      }
    };
    startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHexClick = async (position: string) => {

    const isMultiplayer = gameMode === "multiplayer";
    const isOnline       = gameMode === "online";
    if (!gameState.gameId || gameState.status === "finished") return;
    // Online: solo puede clickar el jugador cuyo rol coincide con el turno actual
    if (isOnline && (gameState.botPlaying || gameState.turn !== onlineRole)) return;
    if (!isMultiplayer && !isOnline && (gameState.botPlaying || gameState.turn !== "j1")) return;
    if (isMultiplayer && gameState.botPlaying) return;
 
    setGameState(prev => ({ ...prev, botPlaying: true }));

    try {
      // userId real — el gateway lo sobreescribe desde el JWT de todas formas,
      // pero lo mandamos para que game-service pueda identificar al jugador 1
      const validateRes = await fetch(
        `${API_URL}/api/game/${gameState.gameId}/validateMove`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, move: position }),
        }
      );
      const validateData = await validateRes.json();

      if (!validateRes.ok || !validateData.valid) {
        alert(validateData.error || "Movimiento inválido");
        setGameState(prev => ({ ...prev, botPlaying: false }));
        return;
      }

      const currentTurn = gameState.turn; // j1 ó j2 según el turno

      setGameState(prev => ({
        ...prev,
        hexData: prev.hexData.map(h => h.position === position ? { ...h, player: currentTurn as "j1" | "j2" } : h),
        players: prev.players.map(p => p.id === prev.players[currentTurn === "j1" ? 0 : 1].id ? { ...p, points: p.points + 5 } : p),
        winner:  validateData.winner || prev.winner,
        status:  validateData.status || prev.status,
      }));

      // En modo online emitir movimiento al rival y no llamar al bot
      if (gameMode === "online" && socketRef.current) {
        const nextTurn = currentTurn === "j1" ? "j2" : "j1";
        socketRef.current.emit('move_made', { code: roomCode, position, turn: nextTurn });
        if (validateData.winner) {
          socketRef.current.emit('game_over', { code: roomCode, winner: validateData.winner });
        }
        setGameState(prev => ({ ...prev, turn: nextTurn as "j1" | "j2", botPlaying: false }));
        return; // no llamar a /move (bot)
      }

      const moveRes = await fetch(`${API_URL}/api/game/${gameState.gameId}/move`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, move: position, mode: gameMode }),
      });
      const moveData = await moveRes.json();

      setGameState(prev => ({
        ...prev,
        hexData: moveData.board,
        turn:    moveData.turn,
        winner:  moveData.winner,
        status:  moveData.status,

         // En vsBot suma puntos al bot, en multiplayer no hace falta ya se suma arriba
        players: gameMode === "vsBot"
          ? prev.players.map(p =>
              p.id === "bot" && moveData.turn === "j1" ? { ...p, points: p.points + 5 } : p
            )
          : prev.players,
        botPlaying: false,
      }));
    } catch (error) {
      console.error("Error during move:", error);
      setGameState(prev => ({ ...prev, botPlaying: false }));
    }
  };

  const player1 = gameState.players[0] || { id: "jugador1", name: t('gameBoard.player1'), points: 0 };
  const player2 = gameState.players[1] || { id: gameMode === 'multiplayer' || gameMode === 'online' ? 'jugador2' : 'bot', name: gameMode === 'multiplayer' || gameMode === 'online' ? t('gameBoard.player2') : 'Bot', points: 0 };

  // Nombre e imagen del usuario logueado y del rival (online)
  const myName         = userProfile?.username     || t('gameBoard.player1');
  const myAvatar       = userProfile?.avatar       || "logo.png";
  const opponentName   = opponentProfile?.username || t('gameBoard.player2');
  const opponentAvatar = opponentProfile?.avatar   || "logo.png";

  // En online el usuario puede ser j1 o j2; en los demás modos siempre es j1
  const isMySlotJ1 = gameMode !== "online" || onlineRole === "j1";

  const p1Name   = isMySlotJ1 ? myName         : opponentName;
  const p1Avatar = isMySlotJ1 ? myAvatar        : opponentAvatar;
  const p2Name   = isMySlotJ1 ? opponentName    : myName;
  const p2Avatar = isMySlotJ1 ? opponentAvatar  : myAvatar;

  return (
    <div className="game-bg min-h-screen flex flex-col">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="gb-header">
        <span className="gb-header-logo">YOVI_ES4D</span>

        <div className="gb-header-status">
          {gameState.status === "finished" ? (
            <span className="gb-status-winner">
              🏆 {gameState.winner === "j1" ? p1Name : p2Name} {t('gameBoard.won')}
            </span>
          ) : gameState.botPlaying ? (
            <span className="gb-status-thinking">
               <span>{gameMode === 'multiplayer' ? t('gameBoard.thinking') || 'Procesando...' : t('gameBoard.botPlaying')}</span>
              <span className="gb-thinking-dots">
                {[0,1,2].map(i => <span key={i} className="thinking-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--coral)", display: "inline-block" }} />)}
              </span>
            </span>
          ) : (
            <span className="gb-status-turn">
              {t('gameBoard.turn')}{" "}
              <span className={gameState.turn === "j1" ? "gb-turn-j1" : "gb-turn-j2"}>
                {gameState.turn === "j1" ? p1Name : p2Name}
              </span>
            </span>
          )}
        </div>

        <span className="gb-header-meta">
          {boardSize}× · #{gameState.gameId?.slice(-6) ?? "------"}
        </span>
      </header>

      {/* ── Área principal ─────────────────────────────── */}
      <main className="gb-main">

        <aside className="gb-player-aside">
          <Jugador
            name={p1Name}
            imgSrc={p1Avatar}
            points={player1.points}
            isActive={gameState.turn === "j1" && !gameState.botPlaying}
            color="violet"
          />
        </aside>

        <section className="gb-board-section">
          {gameState.gameId ? (
            <Triangle hexData={gameState.hexData} onHexClick={handleHexClick} scale={0.85} />
          ) : (
            <div className="gb-loading">
              <div className="gb-loading-dots">
                {[0,1,2].map(i => (
                  <span key={i} className="thinking-dot" style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(124,111,247,0.3)", display: "inline-block" }} />
                ))}
              </div>
              <span className="gb-loading-text">{t('gameBoard.gameStart')}</span>
            </div>
          )}
        </section>

        <aside className="gb-player-aside">
          <Jugador
            name={p2Name}
            imgSrc={p2Avatar}
            points={player2.points}
            isActive={gameState.turn === "j2" && !gameState.botPlaying}
            isPlaying={gameState.botPlaying}
            color="coral"
          />
        </aside>

      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="gb-footer">
        <span className="gb-footer-text">
          {botMode.replace("_", " ")} · {t('gameBoard.board')} {boardSize}× · {gameMode}
        </span>
      </footer>
    </div>
  );
};

export default GameBoard;
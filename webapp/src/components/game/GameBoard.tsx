import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Triangle from "./Triangle";
import Triangle3D from "./Triangle3D";
import Jugador from "./player";
import UserHeader from "../UserHeader";
import { API_URL } from "../../config";
import "./game.css";
import { useTranslation } from "../../i18n";
import { io, Socket } from "socket.io-client";

type PlayerTurn = "j1" | "j2";

interface HexData {
  position: string;
  player: PlayerTurn | null;
}

interface PlayerData {
  id: string;
  name: string;
  points: number;
}

interface UserProfileData {
  username: string;
  avatar: string;
}

interface GameState {
  gameId: string | null;
  hexData: HexData[];
  players: PlayerData[];
  turn: PlayerTurn | null;
  status: "active" | "finished" | null;
  winner: PlayerTurn | null;
  botPlaying: boolean;
  connectedFaces: {
    j1: string[];
    j2: string[];
  };
  connectionEdges: {
    j1: Array<{ from: string; to: string }>;
    j2: Array<{ from: string; to: string }>;
  };
  hasBranch: {
    j1: boolean;
    j2: boolean;
  };
}

interface LocationState {
  gameMode?:    string;
  botMode?:     string;
  boardVariant?: string;
  boardSize?:   number;
  timeLimit?:   number;
  onlineRole?:  string;  // 'j1' | 'j2' — asignado por el servidor en modo online
  roomCode?:    string;
  player2Name?: string;
  startingPlayer?: PlayerTurn;
}

const TETRA_FACES = ["A", "B", "C", "D"] as const;

function createEmptyConnections(): GameState["connectedFaces"] {
  return { j1: [], j2: [] };
}

function createEmptyEdges(): GameState["connectionEdges"] {
  return { j1: [], j2: [] };
}

function createEmptyBranches(): GameState["hasBranch"] {
  return { j1: false, j2: false };
}

function createInitialGameState(): GameState {
  return {
    gameId: null,
    hexData: [],
    players: [],
    turn: null,
    status: null,
    winner: null,
    botPlaying: false,
    connectedFaces: createEmptyConnections(),
    connectionEdges: createEmptyEdges(),
    hasBranch: createEmptyBranches(),
  };
}

function mapPlayersWithZeroPoints(players: PlayerData[]): PlayerData[] {
  return players.map((player) => ({ ...player, points: 0 }));
}

function buildGameStateFromResponse(data: {
  gameId: string | null;
  board: HexData[];
  players: PlayerData[];
  turn?: PlayerTurn | null;
  status?: "active" | "finished" | null;
  winner?: PlayerTurn | null;
  connectedFaces?: GameState["connectedFaces"];
  connectionEdges?: GameState["connectionEdges"];
  hasBranch?: GameState["hasBranch"];
}): GameState {
  return {
    gameId: data.gameId,
    hexData: data.board,
    players: mapPlayersWithZeroPoints(data.players),
    turn: data.turn || "j1",
    status: data.status || "active",
    winner: data.winner || null,
    botPlaying: false,
    connectedFaces: data.connectedFaces || createEmptyConnections(),
    connectionEdges: data.connectionEdges || createEmptyEdges(),
    hasBranch: data.hasBranch || createEmptyBranches(),
  };
}

function getRoleIndex(turn: PlayerTurn | null): number {
  return turn === "j2" ? 1 : 0;
}

function addMovePoints(players: PlayerData[], turn: PlayerTurn | null): PlayerData[] {
  const playerId = players[getRoleIndex(turn)]?.id;

  return players.map((player) =>
    player.id === playerId ? { ...player, points: player.points + 5 } : player
  );
}

function applyValidatedMove(
  prev: GameState,
  position: string,
  currentTurn: PlayerTurn,
  validateData: {
    winner?: PlayerTurn | null;
    status?: "active" | "finished" | null;
    connectedFaces?: GameState["connectedFaces"];
    connectionEdges?: GameState["connectionEdges"];
    hasBranch?: GameState["hasBranch"];
  },
  nextTurn?: PlayerTurn,
): GameState {
  return {
    ...prev,
    hexData: prev.hexData.map((hex) =>
      hex.position === position ? { ...hex, player: currentTurn } : hex
    ),
    players: addMovePoints(prev.players, currentTurn),
    winner: validateData.winner || prev.winner,
    status: validateData.status || prev.status,
    connectedFaces: validateData.connectedFaces || prev.connectedFaces,
    connectionEdges: validateData.connectionEdges || prev.connectionEdges,
    hasBranch: validateData.hasBranch || prev.hasBranch,
    turn: nextTurn ?? prev.turn,
    botPlaying: nextTurn ? false : prev.botPlaying,
  };
}

function applyServerMove(
  prev: GameState,
  moveData: {
    board: HexData[];
    turn: PlayerTurn | null;
    winner: PlayerTurn | null;
    status: "active" | "finished" | null;
    connectedFaces?: GameState["connectedFaces"];
    connectionEdges?: GameState["connectionEdges"];
    hasBranch?: GameState["hasBranch"];
  },
  gameMode: string,
): GameState {
  return {
    ...prev,
    hexData: moveData.board,
    turn: moveData.turn,
    winner: moveData.winner,
    status: moveData.status,
    connectedFaces: moveData.connectedFaces || prev.connectedFaces,
    connectionEdges: moveData.connectionEdges || prev.connectionEdges,
    hasBranch: moveData.hasBranch || prev.hasBranch,
    players: gameMode === "vsBot"
      ? prev.players.map((player) =>
        player.id === "bot" && moveData.turn === "j1"
          ? { ...player, points: player.points + 5 }
          : player
      )
      : prev.players,
    botPlaying: false,
  };
}

function canPlayCurrentTurn(params: {
  gameState: GameState;
  gameMode: string;
  onlineRole: string;
}): boolean {
  const { gameState, gameMode, onlineRole } = params;

  if (!gameState.gameId || gameState.status === "finished") {
    return false;
  }

  if (gameMode === "online") {
    return !gameState.botPlaying && gameState.turn === onlineRole;
  }

  if (gameMode === "multiplayer") {
    return !gameState.botPlaying;
  }

  return !gameState.botPlaying && gameState.turn === "j1";
}

function getRandomAvailablePosition(gameState: GameState): string | null {
  const available = gameState.hexData.filter((hex) => hex.player === null);
  if (!available.length) {
    return null;
  }

  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return available[bytes[0] % available.length].position;
}

function stopActiveTimer(timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>) {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json();
  return { response, data };
}

function buildPlayerMoveBody(gameMode: string, userId: string | null, position: string) {
  return gameMode === "vsBot"
    ? { userId, mode: gameMode }
    : { userId, move: position, mode: gameMode };
}

function registerPlayerName(gameId: string, role: "j1" | "j2", name: string) {
  return fetch(`${API_URL}/api/game/${gameId}/setPlayerName`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, name }),
  }).catch(() => {});
}

function saveGameForPlayer(gameId: string, currentUserId: string, winner: string) {
  return fetch(`${API_URL}/api/game/${gameId}/saveForPlayer`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUserId, winner }),
  }).catch(() => {});
}

const ThinkingDots: React.FC<{ size: number; background: string }> = ({
  size,
  background,
}) => (
  <>
    {[0, 1, 2].map((index) => (
      <span
        key={index}
        className="thinking-dot"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background,
          display: "inline-block",
        }}
      />
    ))}
  </>
);

const TetraProgressTrack: React.FC<{
  name: string;
  playerKey: "j1" | "j2";
  colorClass: "violet" | "coral";
  connectedFaces: string[];
  hasBranch: boolean;
}> = ({ name, playerKey, colorClass, connectedFaces, hasBranch }) => {
  const branchClassName = hasBranch ? `gb-tetra-branch active ${colorClass}` : "gb-tetra-branch";

  return (
    <div className="gb-tetra-track">
      <span className="gb-tetra-track-label">{name}</span>
      <div className="gb-tetra-face-row">
        {TETRA_FACES.map((face) => {
          const isActive = connectedFaces.includes(face);
          const faceClassName = isActive
            ? `gb-tetra-face-pill active ${colorClass}`
            : "gb-tetra-face-pill";

          return (
            <span
              key={`${playerKey}-${face}`}
              className={faceClassName}
            >
              {face}
            </span>
          );
        })}
      </div>
      <span className={branchClassName}>
        {hasBranch ? "Bifurcacion" : "Sin bifurcacion"}
      </span>
    </div>
  );
};

const OpponentDisconnectedView: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="game-bg min-h-screen flex flex-col items-center justify-center">
    <div className="bg-black rounded-2xl px-10 py-8 flex flex-col items-center gap-6 shadow-xl">
      <p className="text-2xl font-semibold text-white">Tu rival se ha desconectado</p>
      <button
        onClick={onBack}
        className="px-6 py-3 rounded-xl bg-white hover:bg-gray-200 text-white font-semibold transition"
      >
        Volver al inicio
      </button>
    </div>
  </div>
);

const GameHeaderStatus: React.FC<{
  gameState: GameState;
  gameMode: string;
  p1Name: string;
  p2Name: string;
  t: ReturnType<typeof useTranslation>["t"];
}> = ({ gameState, gameMode, p1Name, p2Name, t }) => {
  if (gameState.status === "finished") {
    return (
      <span className="gb-status-winner">
        🏆 {gameState.winner === "j1" ? p1Name : p2Name} {t("gameBoard.won")}
      </span>
    );
  }

  if (gameState.botPlaying) {
    return (
      <span className="gb-status-thinking">
        <span>{gameMode === "multiplayer" ? t("gameBoard.thinking") || "Procesando..." : t("gameBoard.botPlaying")}</span>
        <span className="gb-thinking-dots">
          <ThinkingDots size={6} background="var(--coral)" />
        </span>
      </span>
    );
  }

  return (
    <span className="gb-status-turn">
      {t("gameBoard.turn")}{" "}
      <span className={gameState.turn === "j1" ? "gb-turn-j1" : "gb-turn-j2"}>
        {gameState.turn === "j1" ? p1Name : p2Name}
      </span>
    </span>
  );
};

const GameBoardContent: React.FC<{
  gameId: string | null;
  boardVariant: string;
  hexData: HexData[];
  connectionEdges: GameState["connectionEdges"];
  onHexClick: (position: string) => void;
  t: ReturnType<typeof useTranslation>["t"];
}> = ({ gameId, boardVariant, hexData, connectionEdges, onHexClick, t }) => {
  if (!gameId) {
    return (
      <div className="gb-loading">
        <div className="gb-loading-dots">
          <ThinkingDots size={10} background="rgba(124,111,247,0.3)" />
        </div>
        <span className="gb-loading-text">{t("gameBoard.gameStart")}</span>
      </div>
    );
  }

  if (boardVariant === "tetra3d") {
    return (
      <Triangle3D
        hexData={hexData}
        onHexClick={onHexClick}
        scale={0.98}
        connectionEdges={connectionEdges}
      />
    );
  }

  return <Triangle hexData={hexData} onHexClick={onHexClick} scale={0.85} />;
};

const GameBoard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const hasLocationState = Boolean(location.state);


  const {
    gameMode    = "vsBot",
    botMode     = "random_bot",
    boardVariant = "classic",
    boardSize   = 11,
    timeLimit   = 0,
    onlineRole  = "j1",
    roomCode    = "",
    player2Name,
    startingPlayer = "j1",
  } = (location.state as LocationState) ?? {};

  useEffect(() => {
    if (!hasLocationState) {
      navigate("/select", { replace: true });
    }
  }, [hasLocationState, navigate]);

  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile]         = useState<UserProfileData | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<UserProfileData | null>(null);
  const socketRef    = useRef<Socket | null>(null);
  const userIdRef    = useRef<string | null>(null);
  const profilesRef  = useRef<{ my: string; opponent: string }>({ my: "", opponent: "" });
  const gameStateRef = useRef<GameState | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const startGameRef = useRef(false);

  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  const [gameState, setGameState] = useState<GameState>(createInitialGameState());

  useEffect(() => {
    gameStateRef.current = gameState;
  });

  useEffect(() => {
    if (gameState.status === "finished") {
      navigate("/gameover", { state: { ...gameState, userProfile, opponentProfile, gameMode, boardVariant, onlineRole, player2Name } });
    }
  }, [gameState.status, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadOnlineGame(gameId: string) {
    const response = await fetch(`${API_URL}/api/game/${gameId}`, { credentials: "include" });
    const data = await response.json();
    setGameState(buildGameStateFromResponse(data));
  }

  function handleOpponentInfo(name: string, avatar: string) {
    setOpponentProfile({ username: name, avatar });
    profilesRef.current.opponent = name;
    const gameId = gameStateRef.current?.gameId;

    if (gameId) {
      const rivalRole = onlineRole === "j1" ? "j2" : "j1";
      void registerPlayerName(gameId, rivalRole, name);
    }
  }

  async function handleGameJoined(gameId: string) {
    try {
      await loadOnlineGame(gameId);
      if (profilesRef.current.my) {
        await registerPlayerName(gameId, "j2", profilesRef.current.my);
      }
    } catch (err) {
      console.error("Error cargando partida para j2:", err);
    }
  }

  function handleOpponentMove(position: string, turn: PlayerTurn) {
    setGameState((prev) => {
      const opponentRole: PlayerTurn = onlineRole === "j1" ? "j2" : "j1";
      return {
        ...applyValidatedMove(prev, position, opponentRole, {}, turn),
        botPlaying: false,
      };
    });
  }

  function handleOnlineGameOver(winner: PlayerTurn, gameId?: string) {
    setGameState((prev) => {
      const resolvedGameId = gameId ?? prev.gameId;
      if (resolvedGameId && userIdRef.current) {
        void saveGameForPlayer(resolvedGameId, userIdRef.current, winner);
      }
      return { ...prev, winner, status: "finished" };
    });
  }

  // ── Socket online ────────────────────────────────────────
  useEffect(() => {
    if (gameMode !== "online") return;

    const s = io(API_URL, { withCredentials: true });
    socketRef.current = s;

    // Reconectarse a la sala con el nuevo socket del GameBoard
    s.on('connect', () => {
      s.emit('rejoin_room', { code: roomCode, role: onlineRole });
    });

    s.on('opponent_info', ({ name, avatar }: { name: string; avatar: string }) => {
      handleOpponentInfo(name, avatar);
    });

    s.on('game_joined', ({ gameId }: { gameId: string }) => {
      void handleGameJoined(gameId);
    });

    s.on('opponent_move', ({ position, turn }: { position: string; turn: PlayerTurn }) => {
      handleOpponentMove(position, turn);
    });

    s.on('opponent_disconnected', () => {
      setOpponentDisconnected(true);
    });

    s.on('game_over', ({ winner, gameId }: { winner: PlayerTurn; gameId?: string }) => {
      handleOnlineGameOver(winner, gameId);
    });

    return () => { s.disconnect(); };
  }, [gameMode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCurrentUser() {
    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      credentials: "include",
    });

    if (!meRes.ok) {
      navigate("/login");
      return null;
    }

    const meData = await meRes.json();
    const resolvedUserId = String(meData.userId);
    setUserId(resolvedUserId);
    userIdRef.current = resolvedUserId;
    return resolvedUserId;
  }

  async function fetchOwnProfile() {
    const profileRes = await fetch(`${API_URL}/api/user/getUserProfile`, {
      method: "POST",
      credentials: "include",
    });

    if (!profileRes.ok) {
      return null;
    }

    const profileData = await profileRes.json();
    const profile = { username: profileData.username, avatar: profileData.avatar };
    setUserProfile(profile);
    profilesRef.current.my = profileData.username;
    return profile;
  }

  function shareProfileOnline(profile: UserProfileData | null) {
    if (!profile || gameMode !== "online") {
      return;
    }

    socketRef.current?.emit('player_info', {
      code: roomCode,
      name: profile.username,
      avatar: profile.avatar,
    });
  }

  async function runOpeningBotMove(gameId: string, currentUserId: string) {
    setGameState((prev) => ({ ...prev, botPlaying: true }));

    try {
      const moveRes = await fetch(`${API_URL}/api/game/${gameId}/move`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, mode: "vsBot" }),
      });
      const moveData = await moveRes.json();
      setGameState((prev) => applyServerMove(prev, moveData, "vsBot"));
    } catch (error) {
      console.error("Error during bot first move:", error);
      setGameState((prev) => ({ ...prev, botPlaying: false }));
    }
  }

  async function startGame() {
    try {
      if (startGameRef.current) return;
      startGameRef.current = true;

      const resolvedUserId = await fetchCurrentUser();
      if (!resolvedUserId) {
        return;
      }

      const profile = await fetchOwnProfile();
      shareProfileOnline(profile);

      if (gameMode === "online" && onlineRole === "j2") return;

      const res = await fetch(`${API_URL}/api/game/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resolvedUserId, gameMode, botMode, boardSize, startingPlayer, boardVariant }),
      });
      const data = await res.json();

      if (!res.ok || !data.players) {
        console.error("Error en respuesta de start:", data);
        return;
      }

      setGameState(buildGameStateFromResponse(data));

      if (gameMode === "vsBot") startTimer();

      const shouldBotStart = gameMode === "vsBot" && (data.turn === "j2" || startingPlayer === "j2");
      if (shouldBotStart) {
        await runOpeningBotMove(data.gameId, resolvedUserId);
      }

      if (gameMode === "online") {
        socketRef.current?.emit('game_started', { code: roomCode, gameId: data.gameId });
        if (profilesRef.current.my) {
          void registerPlayerName(data.gameId, "j1", profilesRef.current.my);
        }
      }
    } catch (error) {
      console.error("Error starting game:", error);
    }
  }

  useEffect(() => {
    void startGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Limpieza del timer al desmontar
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startTimer = React.useCallback(() => {
    if (!timeLimit || gameMode !== "vsBot") return;
    stopActiveTimer(timerRef);
    setTimeLeft(timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopActiveTimer(timerRef);
          const gs = gameStateRef.current;
          if (gs?.status === "active" && gs.turn === "j1") {
            const nextPosition = getRandomAvailablePosition(gs);
            if (nextPosition) {
              void handleHexClickRef.current(nextPosition);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timeLimit, gameMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // handleHexClick necesita ser accesible desde el closure del timer
  const handleHexClickRef = useRef<(pos: string) => Promise<void> | void>(() => {});

  async function validatePlayerMove(position: string) {
    return fetchJson(`${API_URL}/api/game/${gameState.gameId}/validateMove`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, move: position }),
    });
  }

  function rejectInvalidMove(error?: string) {
    alert(error || "Movimiento inválido");
    setGameState((prev) => ({ ...prev, botPlaying: false }));
  }

  function emitOnlineMoveResult(
    position: string,
    currentTurn: "j1" | "j2",
    validateData: {
      winner?: "j1" | "j2" | null;
      status?: "active" | "finished" | null;
      connectedFaces?: GameState["connectedFaces"];
      connectionEdges?: GameState["connectionEdges"];
      hasBranch?: GameState["hasBranch"];
    },
  ) {
    const nextTurn = currentTurn === "j1" ? "j2" : "j1";
    setGameState((prev) => applyValidatedMove(prev, position, currentTurn, validateData, nextTurn));
    socketRef.current?.emit("move_made", { code: roomCode, position, turn: nextTurn });

    if (validateData.winner) {
      socketRef.current?.emit("game_over", { code: roomCode, winner: validateData.winner, gameId: gameState.gameId });
      if (gameState.gameId && userId) {
        void saveGameForPlayer(gameState.gameId, userId, validateData.winner);
      }
    }
  }

  async function requestBotOrServerMove(position: string) {
    return fetchJson(`${API_URL}/api/game/${gameState.gameId}/move`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPlayerMoveBody(gameMode, userId, position)),
    });
  }

  // Mantener el ref siempre apuntando a la versión más reciente de handleHexClick
  // (se asigna justo después de definir la función)

  const handleHexClick = async (position: string) => {
    if (!canPlayCurrentTurn({ gameState, gameMode, onlineRole })) return;

    stopActiveTimer(timerRef);

    setGameState(prev => ({ ...prev, botPlaying: true }));

    try {
      // userId real — el gateway lo sobreescribe desde el JWT de todas formas,
      // pero lo mandamos para que game-service pueda identificar al jugador 1
      const { response: validateRes, data: validateData } = await validatePlayerMove(position);

      if (!validateRes.ok || !validateData.valid) {
        alert(validateData.error || "Movimiento inválido");
        setGameState(prev => ({ ...prev, botPlaying: false }));
        return;
      }

      const currentTurn = gameState.turn; // j1 ó j2 según el turno


      if (!currentTurn) {
        setGameState(prev => ({ ...prev, botPlaying: false }));
        return;
      }

      setGameState((prev) => applyValidatedMove(prev, position, currentTurn, validateData));


      // En modo online emitir movimiento al rival y no llamar al bot
      if (gameMode === "online" && socketRef.current) {
        const nextTurn = currentTurn === "j1" ? "j2" : "j1";
        // Un único setGameState para evitar que el segundo pise los puntos del primero
        setGameState((prev) => applyValidatedMove(prev, position, currentTurn, validateData, nextTurn));
        socketRef.current.emit('move_made', { code: roomCode, position, turn: nextTurn });
        if (validateData.winner) {
          socketRef.current.emit('game_over', { code: roomCode, winner: validateData.winner, gameId: gameState.gameId });
          // j1 guarda su propio registro al ganar
          if (gameState.gameId && userId) {
            void saveGameForPlayer(gameState.gameId, userId, validateData.winner);
          }
        }
        return;
      }

      const playerEndedGame = Boolean(validateData.winner) || validateData.status === "finished";
      if (playerEndedGame) {
        setGameState(prev => ({
          ...prev,
          botPlaying: false,
        }));
        return;
      }

      const moveRes = await fetch(`${API_URL}/api/game/${gameState.gameId}/move`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPlayerMoveBody(gameMode, userId, position)),
      });
      const moveData = await moveRes.json();

      if (!moveRes.ok) {
        throw new Error(moveData.error || moveData.message || "Error procesando movimiento");
      }

      setGameState((prev) => applyServerMove(prev, moveData, gameMode));

      // Reiniciar timer cuando vuelve el turno al jugador (j1) en vsBot
      if (moveData.turn === "j1" && moveData.status !== "finished") startTimer();

    } catch (error) {
      console.error("Error during move:", error);
      setGameState(prev => ({ ...prev, botPlaying: false }));
    }
  };

  // Mantener el ref actualizado en cada render para que el timer siempre llame a la versión actual
  handleHexClickRef.current = (position) => {
    void handleHexClick(position);
  };

  const player1 = gameState.players[0] || { id: "jugador1", name: t('gameBoard.player1'), points: 0 };
  const isHumanOpponentMode = gameMode === "multiplayer" || gameMode === "online";
  const player2Fallback = isHumanOpponentMode
    ? { id: "jugador2", name: t('gameBoard.player2'), points: 0 }
    : { id: "bot", name: "Bot", points: 0 };
  const player2 = gameState.players[1] || player2Fallback;

  // Nombre e imagen del usuario logueado y del rival (online)
  const myName         = userProfile?.username     || t('gameBoard.player1');
  const myAvatar       = userProfile?.avatar       || "logo.png";
  let opponentName = opponentProfile?.username;
  if (!opponentName && gameMode === "multiplayer") {
    opponentName = player2Name;
  }
  if (!opponentName) {
    opponentName = gameState.players[1]?.name || t('gameBoard.player2');
  }
  const opponentAvatar = opponentProfile?.avatar   || "logo.png";

  // En online el usuario puede ser j1 o j2; en los demás modos siempre es j1
  const isMySlotJ1 = gameMode !== "online" || onlineRole === "j1";

  const p1Name   = isMySlotJ1 ? myName         : opponentName;
  const p1Avatar = isMySlotJ1 ? myAvatar        : opponentAvatar;
  const p2Name   = isMySlotJ1 ? opponentName                              : myName;
  let p2Avatar = myAvatar;
  if (isMySlotJ1) {
    p2Avatar = gameMode === "vsBot" ? "bot_icon.png" : opponentAvatar;
  }
  const headerMeta = `${boardSize}x · #${gameState.gameId?.slice(-6) ?? "------"}`;
  const footerText = `${botMode.replace("_", " ")} · ${t('gameBoard.board')} ${boardSize}x · ${gameMode}`;

  if (!hasLocationState) {
    return null;
  }

  if (opponentDisconnected) {
    return <OpponentDisconnectedView onBack={() => navigate("/select")} />;
  }

  return (
      <div className={`game-bg min-h-screen flex flex-col ${boardVariant === "tetra3d" ? "game-bg-3d" : ""}`}>
        <UserHeader />

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
                <ThinkingDots size={6} background="var(--coral)" />
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

          <div className="gb-header-right">
            {timeLimit > 0 && gameState.status === "active" && (
              <div className="gb-timer" data-urgent={timeLeft <= 5 && gameState.turn === "j1" && !gameState.botPlaying}>
                <span className="gb-timer-value">{timeLeft}</span>
                <span className="gb-timer-label">s</span>
              </div>
            )}
            <span className="gb-header-meta">
              {boardSize}× · #{gameState.gameId?.slice(-6) ?? "------"}
            </span>
          </div>
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

          <section className={`gb-board-section ${boardVariant === "tetra3d" ? "gb-board-section-3d" : ""}`}>
            {boardVariant === "tetra3d" && (
              <div className="gb-tetra-progress">
                <TetraProgressTrack
                  name={p1Name}
                  playerKey="j1"
                  colorClass="violet"
                  connectedFaces={gameState.connectedFaces.j1}
                  hasBranch={gameState.hasBranch.j1}
                />

                <TetraProgressTrack
                  name={p2Name}
                  playerKey="j2"
                  colorClass="coral"
                  connectedFaces={gameState.connectedFaces.j2}
                  hasBranch={gameState.hasBranch.j2}
                />
              </div>
            )}
            <GameBoardContent
              gameId={gameState.gameId}
              boardVariant={boardVariant}
              hexData={gameState.hexData}
              connectionEdges={gameState.connectionEdges}
              onHexClick={handleHexClick}
              t={t}
            />
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

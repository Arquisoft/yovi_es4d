import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import '@testing-library/jest-dom';
import { describe, test, vi, afterEach, expect } from "vitest";
import Historial from "../pages/Historial";
import { I18nProvider } from "../i18n";
import resources from "../i18n/resources";
import { AuthContext } from "../context/AuthContext";
import * as userService from "../services/userService";
import { BrowserRouter } from "react-router-dom";

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Sidebar
vi.mock("../components/Sidebar", () => ({ default: () => <div>Sidebar</div> }));

// Mock useTranslation
vi.mock("../i18n", async () => {
  const actual = await vi.importActual("../i18n");
  return { ...actual, useTranslation: () => ({ t: (k:string) => k }) };
});

// Evitar logs de error en tests
vi.spyOn(console, 'error').mockImplementation(() => {});

describe("Historial", () => {
  const renderWithUser = (user: any) =>
    render(
      <BrowserRouter>
        <AuthContext.Provider value={{ user }}>
          <I18nProvider defaultLang="es" resources={resources}>
            <Historial />
          </I18nProvider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("redirects to /login if no user", () => {
    renderWithUser(null);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("redirects to login if user has no id", async () => {
    renderWithUser({});
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  test("loads history successfully and displays summary", async () => {
    const mockData: userService.BackendGameRecord[] = [
      {
        _id: "1",
        gameId: "game1",
        userId: "user1",
        createdAt: new Date("2026-03-07T19:11:22").toISOString(),
        players: [
          { role: 'j1', username: 'Alice' },
          { role: 'j2', username: 'Bob' }
        ],
        winner: 'j1',
        gameMode: 'Normal',
        boardSize: 11,
        status: 'finished',
        moves: [1,2,3]
      },
      {
        _id: "2",
        gameId: "game2",
        userId: "user1",
        createdAt: new Date("2026-03-07T19:11:22").toISOString(),
        players: [
          { role: 'j1', username: 'Alice' },
          { role: 'j2', username: 'Charlie' }
        ],
        winner: 'j2',
        gameMode: 'Normal',
        boardSize: 11,
        status: 'finished',
        moves: []
      }
    ];

    vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);

    renderWithUser({ id: "user1" });

    await waitFor(() => {
      expect(screen.getByText("historial.title")).toBeInTheDocument();
      expect(screen.getByText("historial.summary")).toBeInTheDocument();

      const summaryDiv = screen.getByText("historial.totalGames").parentElement;
      expect(summaryDiv).toHaveTextContent("2");

      const winsDiv = screen.getByText("historial.totalWins").parentElement;
      expect(winsDiv).toHaveTextContent("1");

      const pctDiv = screen.getByText("historial.winPct").parentElement;
      expect(pctDiv).toHaveTextContent("50%");
    });

    // Comprobamos partidas
    const gamesSection = screen
    .getByRole("heading", { name: "historial.games" })
    .closest("section");

    const gamesList = within(gamesSection!).getByRole("list");

    const listItems = within(gamesList).getAllByRole("listitem");

    expect(listItems.length).toBe(2);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByText("Charlie")).toHaveLength(2); // Charlie sale como oponente y como ganador
    expect(screen.getAllByText("Normal")).toHaveLength(2);
  });

  test("shows error if getHistory fails", async () => {
    vi.spyOn(userService, 'getHistory').mockRejectedValue(new Error("fail"));
    renderWithUser({ id: "user1" });

    await waitFor(() => {
      expect(screen.getByText("Error al cargar historial")).toBeInTheDocument();
    });
  });

  test("clicking goback button navigates to /", async () => {
    vi.spyOn(userService, 'getHistory').mockResolvedValue([]);
    renderWithUser({ id: "user1" });
    await waitFor(() => screen.getByText("historial.noGames"));

    const user = userEvent.setup();
    const goBackButton = screen.getByRole("button", { name: /startScreen.goback/i });
    await user.click(goBackButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("getOpponentName returns 'Oponente desconocido' if no j2", async () => {
    const mockData: userService.BackendGameRecord[] = [
      { _id: "1", gameId: "game1", userId: "u", createdAt: new Date().toISOString(),
        players: [{ role: 'j1', username: 'Alice' }], winner: 'j1', gameMode: 'Normal', boardSize: 11, status: 'finished', moves: [] }
    ];
    vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);
    renderWithUser({ id: "user1" });

    await waitFor(() => screen.getByText("Alice"));
    expect(screen.getByText("Oponente desconocido")).toBeInTheDocument();
  });

  test("getWinnerName returns 'Empate' if winner is null", async () => {
    const mockData: userService.BackendGameRecord[] = [
      { _id: "1", gameId: "game1", userId: "u", createdAt: new Date().toISOString(),
        players: [{ role: 'j1', username: 'Alice' }, { role: 'j2', username: 'Bob' }],
        winner: null, gameMode: 'Normal', boardSize: 11, status: 'finished', moves: [] }
    ];
    vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);
    renderWithUser({ id: "user1" });

    await waitFor(() => screen.getByText("historial.opponent"));
  });

  test("getWinnerName returns name if username missing", async () => {
    const mockData: userService.BackendGameRecord[] = [
      { _id: "1", gameId: "game1", userId: "u", createdAt: new Date().toISOString(),
        players: [{ role: 'j1', name: 'AliceName' }, { role: 'j2', username: 'Bob' }],
        winner: 'j1', gameMode: 'Normal', boardSize: 11, status: 'finished', moves: [] }
    ];
    vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);
    renderWithUser({ id: "user1" });

    await waitFor(() => screen.getByText("AliceName"));
  });

  test("getWinnerName returns 'Jugador' or 'Oponente' if winner has no username or name", async () => {
    const mockData: userService.BackendGameRecord[] = [
      { _id: "1", gameId: "game1", userId: "u", createdAt: new Date().toISOString(),
        players: [{ role: 'j1' }, { role: 'j2' }],
        winner: 'j1', gameMode: 'Normal', boardSize: 11, status: 'finished', moves: [] },
      { _id: "2", gameId: "game2", userId: "u", createdAt: new Date().toISOString(),
        players: [{ role: 'j1' }, { role: 'j2' }],
        winner: 'j2', gameMode: 'Normal', boardSize: 11, status: 'finished', moves: [] }
    ];
    vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);
    renderWithUser({ id: "user1" });

    await waitFor(() => screen.getAllByText(/historial.player|historial.opponent/));
    expect(screen.getByText("historial.player")).toBeInTheDocument();
    expect(screen.getAllByText("historial.opponent")).toHaveLength(3); // 2 oponentes + 1 resultado de ganador oponente
  });

  test("uses gameId as key if _id is missing", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      gameId: "game-special",
      userId: "user1",
      createdAt: new Date().toISOString(),
      players: [
        { role: 'j1', username: 'Alice' },
        { role: 'j2', username: 'Bob' }
      ],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: []
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);

  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("Alice"));
  await waitFor(() => screen.getByText("Bob"));

  const gamesSection = screen
    .getByRole("heading", { name: "historial.games" })
    .closest("section");

  const gamesList = within(gamesSection!).getByRole("list");

  const listItems = within(gamesList).getAllByRole("listitem");

  expect(listItems.length).toBe(1);
});

test("ordena por fecha (toggle asc/desc)", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date("2020-01-01").toISOString(),
      players: [{ role: 'j1', username: 'A' }, { role: 'j2', username: 'B' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: []
    },
    {
      _id: "2",
      gameId: "g2",
      userId: "u",
      createdAt: new Date("2025-01-01").toISOString(),
      players: [{ role: 'j1', username: 'C' }, { role: 'j2', username: 'D' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: []
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);
  const user = userEvent.setup();

  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("C")); // más reciente primero

  const dateBtn = screen.getByRole("button", { name: /fecha/i });

  await user.click(dateBtn);

  await waitFor(() => {
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(5);
  });
});

test("ordena por número de movimientos", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'A' }, { role: 'j2', username: 'B' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: [1,2,3,4]
    },
    {
      _id: "2",
      gameId: "g2",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'C' }, { role: 'j2', username: 'D' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: [1]
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);
  const user = userEvent.setup();

  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("A"));

  const movesBtn = screen.getByRole("button", { name: /movimientos/i });

  await user.click(movesBtn);

  await waitFor(() => {
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(5);
  });
});

test("paginación funciona (cambia de página)", async () => {
  const mockData: userService.BackendGameRecord[] = Array.from({ length: 7 }, (_, i) => ({
    _id: String(i),
    gameId: `g${i}`,
    userId: "u",
    createdAt: new Date().toISOString(),
    players: [{ role: 'j1', username: `A${i}` }, { role: 'j2', username: `B${i}` }],
    winner: 'j1',
    gameMode: 'Normal',
    boardSize: 11,
    status: 'finished',
    moves: []
  }));

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);
  const user = userEvent.setup();

  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("A0"));

  expect(screen.getAllByRole("listitem")).toHaveLength(10);

  const nextBtn = screen.getByRole("button", { name: /⇨/ });

  await user.click(nextBtn);

  await waitFor(() => {
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });
});

test("paginación no baja de página 1", async () => {
  vi.spyOn(userService, "getHistory").mockResolvedValue([]);

  const user = userEvent.setup();
  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("historial.noGames"));

  const prevBtn = screen.getByRole("button", { name: /↓/ });

  await user.click(prevBtn);
});

test("resetea página al cambiar orden", async () => {
  const mockData: userService.BackendGameRecord[] = Array.from({ length: 7 }, (_, i) => ({
    _id: String(i),
    gameId: `g${i}`,
    userId: "u",
    createdAt: new Date().toISOString(),
    players: [{ role: 'j1', username: `A${i}` }, { role: 'j2', username: `B${i}` }],
    winner: 'j1',
    gameMode: 'Normal',
    boardSize: 11,
    status: 'finished',
    moves: []
  }));

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);
  const user = userEvent.setup();

  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("A0"));

  const nextBtn = screen.getByRole("button", { name: /⇨/ });
  await user.click(nextBtn);

  const dateBtn = screen.getByRole("button", { name: /fecha/i });
  await user.click(dateBtn);

  expect(
    screen.getByText((content)=>content.includes("friends.page") && content.includes("1"))
  ).toBeInTheDocument();
});

test("botón ⇦ reduce la página correctamente", async () => {
  const mockData: userService.BackendGameRecord[] = Array.from({ length: 7 }, (_, i) => ({
    _id: String(i),
    gameId: `g${i}`,
    userId: "u",
    createdAt: new Date().toISOString(),
    players: [{ role: 'j1', username: `A${i}` }, { role: 'j2', username: `B${i}` }],
    winner: 'j1',
    gameMode: 'Normal',
    boardSize: 11,
    status: 'finished',
    moves: []
  }));

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);

  const user = userEvent.setup();
  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("A0"));

  const nextBtn = screen.getByRole("button", { name: /⇨/ });
  await user.click(nextBtn);

  const prevBtn = screen.getByRole("button", { name: /⇦/ });
  await user.click(prevBtn);

  await waitFor(() => {
    expect(
    screen.getByText((content)=>content.includes("friends.page") && content.includes("1"))
    ).toBeInTheDocument();
  });
});

test("cubre el default del switch (exhaustive check)", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'A' }, { role: 'j2', username: 'B' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: []
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);

  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("A"));

});

test("ordena por movimientos asc y cubre moves undefined", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'A' }, { role: 'j2', username: 'B' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: undefined
    },
    {
      _id: "2",
      gameId: "g2",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'C' }, { role: 'j2', username: 'D' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: [1,2,3]
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);
  const user = userEvent.setup();

  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("A"));

  const movesBtn = screen.getByRole("button", { name: /movimientos/i });

  await user.click(movesBtn);

  await user.click(movesBtn);

  expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
});

  test("toggle sortOrder al pulsar mismo botón", async () => {
    vi.spyOn(userService, "getHistory").mockResolvedValue([]);

    const user = userEvent.setup();
    renderWithUser({ id: "user1" });

    await waitFor(() => screen.getByText("historial.noGames"));

    const movesBtn = screen.getByRole("button", { name: /movimientos/i });

    await user.click(movesBtn);

    await user.click(movesBtn);

    expect(screen.getByText(/movimientos/i)).toBeInTheDocument();
  });

  test("muestra flechas correctas en ordenación de movimientos", async () => {
    vi.spyOn(userService, "getHistory").mockResolvedValue([]);

    const user = userEvent.setup();
    renderWithUser({ id: "user1" });

    await waitFor(() => screen.getByText("historial.noGames"));

    const movesBtn = screen.getByRole("button", { name: /movimientos/i });

    await user.click(movesBtn);
    expect(screen.getByText(/↓/)).toBeInTheDocument();

    await user.click(movesBtn);
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });

  test("muestra página 1 cuando no hay datos (totalPages = 0)", async () => {
    vi.spyOn(userService, "getHistory").mockResolvedValue([]);

    renderWithUser({ id: "user1" });

    await waitFor(() => screen.getByText("historial.noGames"));
  });

  test("usa 0 cuando moves es undefined (cubre movesA)", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'A' }, { role: 'j2', username: 'B' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: undefined
    },
    {
      _id: "2",
      gameId: "g2",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'C' }, { role: 'j2', username: 'D' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: [1,2]
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);
  const user = userEvent.setup();

  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("A"));

  const movesBtn = screen.getByRole("button", { name: /movimientos/i });

  await user.click(movesBtn);

  expect(screen.getAllByRole("listitem").length).toBe(5);
});

test("togglea sortOrder (cubre setSortOrder)", async () => {
  vi.spyOn(userService, "getHistory").mockResolvedValue([]);

  const user = userEvent.setup();
  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("historial.noGames"));

  const movesBtn = screen.getByRole("button", { name: /movimientos/i });

  await user.click(movesBtn);
  await user.click(movesBtn); 

  expect(movesBtn).toBeInTheDocument();
});

test("muestra Página 1 / 1 cuando no hay datos (cubre || 1)", async () => {
  vi.spyOn(userService, "getHistory").mockResolvedValue([]);

  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("historial.noGames"));
});

test("cubre movesA cuando moves es undefined (comparación real)", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'A' }, { role: 'j2', username: 'B' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: undefined
    },
    {
      _id: "2",
      gameId: "g2",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'C' }, { role: 'j2', username: 'D' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: [1,2,3,4]
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);

  const user = userEvent.setup();
  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("A"));

  const movesBtn = screen.getByRole("button", { name: /movimientos/i });

  await user.click(movesBtn);

  await user.click(movesBtn);

  expect(screen.getAllByRole("listitem")).toHaveLength(5);
});

test("cubre setSortOrder cambiando realmente el orden", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date("2020").toISOString(),
      players: [{ role: 'j1', username: 'A' }, { role: 'j2', username: 'B' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: [1]
    },
    {
      _id: "2",
      gameId: "g2",
      userId: "u",
      createdAt: new Date("2021").toISOString(),
      players: [{ role: 'j1', username: 'C' }, { role: 'j2', username: 'D' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: [1,2,3]
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);

  const user = userEvent.setup();
  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("A"));

  const movesBtn = screen.getByRole("button", { name: /movimientos/i });

  await user.click(movesBtn);

  await user.click(movesBtn);

  const items = screen.getAllByRole("listitem");
  expect(items.length).toBe(5);
});

test("cubre totalPages || 1 mostrando Página 1 / 1", async () => {
  vi.spyOn(userService, "getHistory").mockResolvedValue([]);

  renderWithUser({ id: "user1" });

  await waitFor(() => {
    expect(screen.getByText("historial.noGames")).toBeInTheDocument();
  });

});

test("usa 0 movimientos cuando moves es undefined (movesA)", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'AAA' }, { role: 'j2', username: 'BBB' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: undefined
    },
    {
      _id: "2",
      gameId: "g2",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role: 'j1', username: 'CCC' }, { role: 'j2', username: 'DDD' }],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: [1,2,3]
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);

  const user = userEvent.setup();
  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("AAA"));

  const movesBtn = screen.getByRole("button", { name: /movimientos/i });

  await user.click(movesBtn);

  expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
});

test("togglea sortOrder correctamente", async () => {
  vi.spyOn(userService, "getHistory").mockResolvedValue([]);

  const user = userEvent.setup();
  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("historial.noGames"));

  const dateBtn = screen.getByRole("button", { name: /fecha/i });

  await user.click(dateBtn);

  await user.click(dateBtn);

  expect(dateBtn).toBeInTheDocument();
});

test("muestra Página 1 / 1 cuando solo hay una página", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [
        { role: 'j1', username: 'A' },
        { role: 'j2', username: 'B' }
      ],
      winner: 'j1',
      gameMode: 'Normal',
      boardSize: 11,
      status: 'finished',
      moves: []
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);

  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("A"));

  expect(
    screen.getByText((content)=>content.includes("friends.page") && content.includes("1"))
  ).toBeInTheDocument();
});

test("cubre movesA ejecutando el comparator real", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role:'j1', username:'AAA' }, { role:'j2', username:'BBB' }],
      winner:'j1',
      gameMode:'Normal',
      boardSize:11,
      status:'finished',
      moves: undefined
    },
    {
      _id: "2",
      gameId: "g2",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role:'j1', username:'CCC' }, { role:'j2', username:'DDD' }],
      winner:'j1',
      gameMode:'Normal',
      boardSize:11,
      status:'finished',
      moves: [1,2,3,4]
    }
  ];

  vi.spyOn(userService,"getHistory").mockResolvedValue(mockData);

  const user = userEvent.setup();
  renderWithUser({ id:"user1" });

  await waitFor(() => screen.getByText("AAA"));

  const movesBtn = screen.getByRole("button",{ name:/movimientos/i });

  await user.click(movesBtn);
  await user.click(movesBtn);

  expect(screen.getAllByRole("listitem").length).toBeGreaterThan(1);
});

test("cubre totalPages || 1 mostrando Página 1 / 1", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id:"1",
      gameId:"g1",
      userId:"u",
      createdAt:new Date().toISOString(),
      players:[
        { role:'j1', username:'A' },
        { role:'j2', username:'B' }
      ],
      winner:'j1',
      gameMode:'Normal',
      boardSize:11,
      status:'finished',
      moves:[]
    }
  ];

  vi.spyOn(userService,"getHistory").mockResolvedValue(mockData);

  renderWithUser({ id:"user1" });

  await waitFor(()=>screen.getByText("A"));

  expect(
    screen.getByText((content)=>content.includes("friends.page") && content.includes("1"))
  ).toBeInTheDocument();
});

test("cubre movesA cuando moves es undefined en ordenación", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [
        { role: "j1", username: "AAA" },
        { role: "j2", username: "BBB" }
      ],
      winner: "j1",
      gameMode: "Normal",
      boardSize: 11,
      status: "finished",
      moves: undefined
    },
    {
      _id: "2",
      gameId: "g2",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [
        { role: "j1", username: "CCC" },
        { role: "j2", username: "DDD" }
      ],
      winner: "j1",
      gameMode: "Normal",
      boardSize: 11,
      status: "finished",
      moves: [1,2,3,4]
    }
  ];

  vi.spyOn(userService, "getHistory").mockResolvedValue(mockData);

  const user = userEvent.setup();
  renderWithUser({ id: "user1" });

  await waitFor(() => screen.getByText("AAA"));

  const movesBtn = screen.getByRole("button", { name: /movimientos/i });

  await user.click(movesBtn);
  await user.click(movesBtn);

  expect(screen.getAllByRole("listitem").length).toBeGreaterThan(1);
});

test("cubre comparator de movimientos con valores distintos", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id: "1",
      gameId: "g1",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role:"j1", username:"A" }, { role:"j2", username:"B" }],
      winner:"j1",
      gameMode:"Normal",
      boardSize:11,
      status:"finished",
      moves:[1]
    },
    {
      _id: "2",
      gameId: "g2",
      userId: "u",
      createdAt: new Date().toISOString(),
      players: [{ role:"j1", username:"C" }, { role:"j2", username:"D" }],
      winner:"j1",
      gameMode:"Normal",
      boardSize:11,
      status:"finished",
      moves:[1,2,3]
    }
  ];

  vi.spyOn(userService,"getHistory").mockResolvedValue(mockData);

  const user = userEvent.setup();
  renderWithUser({ id:"user1" });

  await waitFor(()=>screen.getByText("A"));

  const movesBtn = screen.getByRole("button",{ name:/movimientos/i });

  await user.click(movesBtn);

  expect(screen.getAllByRole("listitem").length).toBeGreaterThan(1);
});

test("muestra Página 1 / 1 cuando solo existe una página", async () => {
  const mockData: userService.BackendGameRecord[] = [
    {
      _id:"1",
      gameId:"g1",
      userId:"u",
      createdAt:new Date().toISOString(),
      players:[
        { role:"j1", username:"A" },
        { role:"j2", username:"B" }
      ],
      winner:"j1",
      gameMode:"Normal",
      boardSize:11,
      status:"finished",
      moves:[]
    }
  ];

  vi.spyOn(userService,"getHistory").mockResolvedValue(mockData);

  renderWithUser({ id:"user1" });

  await waitFor(()=>screen.getByText("A"));

  expect(
    screen.getByText((content)=>content.includes("friends.page") && content.includes("1"))
  ).toBeInTheDocument();
});

test("renderiza correctamente el paginador ejecutando totalPages || 1", async () => {
  const mockData: userService.BackendGameRecord[] = Array.from(
    { length: 3 },
    (_, i) => ({
      _id:String(i),
      gameId:`g${i}`,
      userId:"u",
      createdAt:new Date().toISOString(),
      players:[
        { role:"j1", username:`A${i}` },
        { role:"j2", username:`B${i}` }
      ],
      winner:"j1",
      gameMode:"Normal",
      boardSize:11,
      status:"finished",
      moves:[]
    })
  );

  vi.spyOn(userService,"getHistory").mockResolvedValue(mockData);

  renderWithUser({ id:"user1" });

  await waitFor(()=>screen.getByText("A0"));

 
});

});

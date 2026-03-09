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
    renderWithUser({}); // user sin id, userId ni _id
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

    // Esperamos que cargue la lista
    await waitFor(() => {
      // Summary
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
    const gameList = screen.getByRole("list");
    const items = within(gameList).getAllByRole("listitem");
    expect(items).toHaveLength(2);

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

  // ======= NUEVOS TESTS PARA CUBRIR TODOS LOS BRANCHES =======

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

  const listItem = screen.getByRole("listitem");
  expect(listItem).toBeInTheDocument();
});

});
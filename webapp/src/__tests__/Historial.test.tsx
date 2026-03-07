import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import '@testing-library/jest-dom';
import { describe, test, vi, beforeEach, afterEach, expect } from "vitest";
import Historial from "../pages/Historial";
import { I18nProvider } from "../i18n";
import resources from "../i18n/resources";
import { AuthContext } from "../context/AuthContext";
import * as userService from "../services/userService";
import { BrowserRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../components/Sidebar", () => ({ default: () => <div>Sidebar</div> }));
vi.mock("../i18n", async () => {
  const actual = await vi.importActual("../i18n");
  return { ...actual, useTranslation: () => ({ t: (k:string) => k }) };
});

vi.spyOn(console, 'error').mockImplementation(() => {}); // evita logs de error en test

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

    // Comprobamos loading
    expect(screen.getByText(/Cargando historial.../i)).toBeInTheDocument();

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
    expect(screen.getAllByText("Charlie")).toHaveLength(2); // charlie sale dos veces, como oponente y como ganador
    expect(screen.getAllByText("Normal")).toHaveLength(2);
  });

  test("shows error if getHistory fails", async () => {
    vi.spyOn(userService, 'getHistory').mockRejectedValue(new Error("fail"));

    renderWithUser({ id: "user1" });

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar historial/i)).toBeInTheDocument();
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

  test("redirects to login if user has no id", async () => {
    const navigate = vi.fn();
    render(
        <AuthContext.Provider value={{ user: null }}>
        <Historial />
        </AuthContext.Provider>
    );

    await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  test("shows error message if getHistory fails", async () => {
  vi.spyOn(userService, "getHistory").mockRejectedValueOnce(new Error("fail"));
  renderWithUser({ id: "user1" });

  await waitFor(() => {
    expect(screen.getByText("Error al cargar historial")).toBeInTheDocument();
  });
});

test("redirects to login if user is missing", () => {
  render(
    <AuthContext.Provider value={{ user: null }}>
      <Historial />
    </AuthContext.Provider>
  );

  expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
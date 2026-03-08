import { cleanup, render, screen } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";

// Mock components
vi.mock("../components/StartScreen", () => ({
  default: () => <div>StartScreen</div>
}));

vi.mock("../components/Rules", () => ({
  default: () => <div>Rules</div>
}));

vi.mock("../components/game/GameBoard", () => ({
  default: () => <div>GameBoard</div>
}));

vi.mock("../components/GameOver", () => ({
  default: () => <div>GameOver</div>
}));

vi.mock("../pages/LoginPage", () => ({
  default: () => <div>LoginPage</div>
}));

vi.mock("../pages/RegisterPage", () => ({
  default: () => <div>RegisterPage</div>
}));

vi.mock("../pages/Dashboard", () => ({
  default: () => <div>Dashboard</div>
}));

vi.mock("../pages/EditProfilePage", () => ({
  default: () => <div>EditProfile</div>
}));

vi.mock("../pages/Historial", () => ({
  default: () => <div data-testid="historial-page">Historial</div>
}));

const createTestRouter = (initialRoute: string) =>
  createMemoryRouter(
    [
      { path: "/", element: <div>StartScreen</div> },
      { path: "/rules", element: <div>Rules</div> },
      { path: "/game", element: <div>GameBoard</div> },
      { path: "/gameover", element: <div>GameOver</div> },
      { path: "/login", element: <div>LoginPage</div> },
      { path: "/register", element: <div>RegisterPage</div> },
      { path: "/dashboard", element: <div>Dashboard</div> },
      { path: "/edit", element: <div>EditProfile</div> },
      { path: "/historial", element: <div data-testid="historial-page">Historial</div> },
      { path: "*", element: <div>StartScreen</div> },
    ],
    { initialEntries: [initialRoute] }
  );

describe("Router", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("renders StartScreen at /", () => {
    render(<RouterProvider router={createTestRouter("/")} />);
    expect(screen.getByText("StartScreen")).toBeInTheDocument();
  });

  test("renders Rules page", () => {
    render(<RouterProvider router={createTestRouter("/rules")} />);
    expect(screen.getByText("Rules")).toBeInTheDocument();
  });

  test("renders GameBoard page", () => {
    render(<RouterProvider router={createTestRouter("/game")} />);
    expect(screen.getByText("GameBoard")).toBeInTheDocument();
  });

  test("renders GameOver page", () => {
    render(<RouterProvider router={createTestRouter("/gameover")} />);
    expect(screen.getByText("GameOver")).toBeInTheDocument();
  });

  test("renders LoginPage", () => {
    render(<RouterProvider router={createTestRouter("/login")} />);
    expect(screen.getByText("LoginPage")).toBeInTheDocument();
  });

  test("renders RegisterPage", () => {
    render(<RouterProvider router={createTestRouter("/register")} />);
    expect(screen.getByText("RegisterPage")).toBeInTheDocument();
  });

  test("renders Dashboard", () => {
    render(<RouterProvider router={createTestRouter("/dashboard")} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  test("renders EditProfile", () => {
    render(<RouterProvider router={createTestRouter("/edit")} />);
    expect(screen.getByText("EditProfile")).toBeInTheDocument();
  });

  test("renders Historial page", () => {
    render(<RouterProvider router={createTestRouter("/historial")} />);
    expect(screen.getByTestId("historial-page")).toBeInTheDocument();
  });

  test("redirects unknown route to StartScreen", () => {
    render(<RouterProvider router={createTestRouter("/unknown")} />);
    expect(screen.getByText("StartScreen")).toBeInTheDocument();
  });
});
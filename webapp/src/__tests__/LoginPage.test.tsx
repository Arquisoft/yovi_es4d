import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import "@testing-library/jest-dom";

// Mock LoginForm
vi.mock("../components/LoginForm", () => ({
  default: () => <div data-testid="login-form">LoginForm</div>
}));

// Mock Sidebar
vi.mock("../components/Sidebar", () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

// Mock useTranslation
vi.mock("../i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe("LoginPage", () => {

  test("renders sidebar", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  test("renders login form", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });

  test("renders register link", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const registerLink = screen.getByRole("link", { name: "users.register" });

    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/register");
  });

  test("renders account text", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText("users.account")).toBeInTheDocument();
  });

  test("renders footer with github link", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const footerLink = screen.getByRole("link", { name: "footer.credits" });

    expect(footerLink).toBeInTheDocument();
    expect(footerLink).toHaveAttribute(
      "href",
      "https://github.com/Arquisoft/yovi_es4d/tree/master"
    );
  });

});
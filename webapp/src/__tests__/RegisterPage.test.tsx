import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";

import RegisterPage from "../pages/RegisterPage";

// Mock RegisterForm
vi.mock("../components/RegisterForm", () => ({
  default: () => <div data-testid="register-form">RegisterForm</div>
}));

// Mock Sidebar
vi.mock("../components/Sidebar", () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

// Mock translations
vi.mock("../i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe("RegisterPage", () => {

  test("renders sidebar", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  test("renders register form", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("register-form")).toBeInTheDocument();
  });

  test("renders login link", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const loginLink = screen.getByRole("link", { name: "users.login" });

    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  test("renders have account text", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByText("users.haveaccount")).toBeInTheDocument();
  });

  test("renders footer github link", () => {
    render(
      <MemoryRouter>
        <RegisterPage />
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
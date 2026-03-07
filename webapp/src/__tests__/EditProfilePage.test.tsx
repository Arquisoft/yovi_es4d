import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import '@testing-library/jest-dom';
import { describe, test, vi, afterEach, beforeEach, expect } from "vitest";
import EditUserPage from "../pages/EditProfilePage";
import { I18nProvider } from "../i18n";
import resources from "../i18n/resources";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Mocks
vi.mock("axios");
vi.mock("../components/Sidebar", () => ({ default: () => <div>Sidebar</div> }));
vi.mock("../i18n", async () => {
  const actual = await vi.importActual("../i18n");
  return { ...actual, useTranslation: () => ({ t: (k:string) => k }) };
});

const mockedAxios = axios as unknown as { post: typeof vi.fn };
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderPage = () =>
  render(
    <I18nProvider defaultLang="es" resources={resources}>
      <EditUserPage />
    </I18nProvider>
  );

describe("EditUserPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows loading initially", () => {
    renderPage();
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  test("loads profile successfully", async () => {
    mockedAxios.post = vi.fn().mockResolvedValueOnce({
      data: { username: "user1", email: "user1@test.com", avatar: "" },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("user1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("user1@test.com")).toBeInTheDocument();
    });
  });

  test("shows error if loading profile fails", async () => {
    mockedAxios.post = vi.fn().mockRejectedValueOnce({ message: "fail" });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  test("updates username successfully", async () => {
    mockedAxios.post = vi.fn()
      .mockResolvedValueOnce({ data: { username: "user1", email: "user1@test.com" } }) // loadProfile
      .mockResolvedValueOnce({}); // saveUsername

    renderPage();
    await waitFor(() => screen.getByDisplayValue("user1"));

    const input = screen.getByDisplayValue("user1");
    await userEvent.clear(input);
    await userEvent.type(input, "newUser");

    const button = screen.getByText("editUser.updateUsername");
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("editUser.usernameUpdated")).toBeInTheDocument();
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/editUsername"),
      { username: "newUser" },
      expect.any(Object)
    );
  });

  test("shows error if updating username fails", async () => {
    mockedAxios.post = vi.fn()
      .mockResolvedValueOnce({ data: { username: "user1", email: "user1@test.com" } }) // loadProfile
      .mockRejectedValueOnce({ message: "update failed" }); // saveUsername

    renderPage();
    await waitFor(() => screen.getByDisplayValue("user1"));

    const button = screen.getByText("editUser.updateUsername");
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("update failed")).toBeInTheDocument();
    });
  });

  test("shows error when new passwords do not match", async () => {
    mockedAxios.post = vi.fn().mockResolvedValueOnce({ data: { username: "u", email: "e" } });

    renderPage();
    await waitFor(() => screen.getByDisplayValue("u"));

    await userEvent.type(screen.getByLabelText(/editUser.currentPassword/i), "oldpass");
    await userEvent.type(screen.getByLabelText(/editUser.newPassword/i), "newpass");
    await userEvent.type(screen.getByLabelText(/editUser.confirmPassword/i), "wrongpass");

    const button = screen.getByText("editUser.changePassword");
    await userEvent.click(button);

    expect(screen.getByText("editUser.passwordMatch")).toBeInTheDocument();
  });

  test("changes password successfully", async () => {
    mockedAxios.post = vi.fn()
      .mockResolvedValueOnce({ data: { username: "u", email: "e" } }) // loadProfile
      .mockResolvedValueOnce({}); // changePassword

    renderPage();
    await waitFor(() => screen.getByDisplayValue("u"));

    await userEvent.type(screen.getByLabelText(/editUser.currentPassword/i), "oldpass");
    await userEvent.type(screen.getByLabelText(/editUser.newPassword/i), "newpass");
    await userEvent.type(screen.getByLabelText(/editUser.confirmPassword/i), "newpass");

    const button = screen.getByText("editUser.changePassword");
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("editUser.passwordChanged")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/editUser.currentPassword/i)).toHaveValue("");
    expect(screen.getByLabelText(/editUser.newPassword/i)).toHaveValue("");
    expect(screen.getByLabelText(/editUser.confirmPassword/i)).toHaveValue("");
  });

  test("shows error if changing password fails", async () => {
    mockedAxios.post = vi.fn()
      .mockResolvedValueOnce({ data: { username: "u", email: "e" } }) // loadProfile
      .mockRejectedValueOnce({ message: "password fail" }); // changePassword

    renderPage();
    await waitFor(() => screen.getByDisplayValue("u"));

    await userEvent.type(screen.getByLabelText(/editUser.currentPassword/i), "oldpass");
    await userEvent.type(screen.getByLabelText(/editUser.newPassword/i), "newpass");
    await userEvent.type(screen.getByLabelText(/editUser.confirmPassword/i), "newpass");

    const button = screen.getByText("editUser.changePassword");
    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("password fail")).toBeInTheDocument();
    });
  });

  test("clicking action-row goback button navigates to /", async () => {
    const user = userEvent.setup();

    mockedAxios.post = vi.fn().mockResolvedValueOnce({ data: { username: "u", email: "e" } });

    renderPage();
    await waitFor(() => screen.getByDisplayValue("u"));

    const goBackButton = screen.getByRole("button", { name: /startScreen.goback/i });
    await user.click(goBackButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

});
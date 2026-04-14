import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import EditUserPage from "../pages/EditProfilePage";
import axios from "axios";
import '@testing-library/jest-dom'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { AuthContext } from "../context/AuthContext";
import { API_URL } from "../config";

vi.mock("../i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("axios");
const mockedAxios = axios as any;

const mockUser = { email: "user1@test.com", username: "user1", avatar: null };
const mockLogout = vi.fn();

const renderWithAuth = (ui: React.ReactNode) =>
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: mockUser, logout: mockLogout }}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  );

describe("EditUserPage Vitest", () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockNavigate.mockReset();
  });


  test("renders profile correctly", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

    renderWithAuth(<EditUserPage />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    await screen.findByDisplayValue("user1@test.com");
    await screen.findByDisplayValue("user1");
  });

  test("loads profile catch 401 navigates to login", async () => {
    mockedAxios.post.mockRejectedValueOnce({ response: { status: 401 } });

    renderWithAuth(<EditUserPage />);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });

  test("shows error if loadProfile fails with other error", async () => {
    mockedAxios.post.mockRejectedValueOnce({ response: { data: "Loading..." } });

    renderWithAuth(<EditUserPage />);

    const errorEl = await screen.findByText("Loading...");
    expect(errorEl).toBeInTheDocument();
  });

  test("updates username successfully", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser }); // loadProfile
    mockedAxios.post.mockResolvedValueOnce({}); // editUsername
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser }); // loadProfile de nuevo

    renderWithAuth(<EditUserPage />);

    await screen.findByDisplayValue("user1");

    const usernameInput = screen.getByLabelText("editUser.username");
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, "newuser");

    const updateButton = screen.getByText("editUser.updateUsername");
    await userEvent.click(updateButton);

    await screen.findByText("editUser.usernameUpdated");

    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${API_URL}/api/user/getUserProfile`,
      {},
      { withCredentials: true }
    );
  });

  test("shows error if updating username fails", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser }); // loadProfile
    mockedAxios.post.mockRejectedValueOnce({ response: { data: "Username error" } });

    renderWithAuth(<EditUserPage />);

    await screen.findByDisplayValue("user1");

    const button = screen.getByText("editUser.updateUsername");
    await userEvent.click(button);

    await screen.findByText("Username error");
  });

  test("saveUsername: err.response exists but data falsy", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser }); // loadProfile
    mockedAxios.post.mockRejectedValueOnce({ response: {}, message: "Username message" });

    renderWithAuth(<EditUserPage />);

    await screen.findByDisplayValue("user1");

    const usernameInput = screen.getByLabelText("editUser.username");
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, "newuser");

    await userEvent.click(screen.getByText("editUser.updateUsername"));

    await screen.findByText("Username message");
  });

  test("saveUsername: err.response undefined, uses err.message", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser }); // loadProfile
    mockedAxios.post.mockRejectedValueOnce({ message: "Network username error" });

    renderWithAuth(<EditUserPage />);

    await screen.findByDisplayValue("user1");

    const usernameInput = screen.getByLabelText("editUser.username");
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, "newuser");

    await userEvent.click(screen.getByText("editUser.updateUsername"));

    await screen.findByText("Network username error");
  });

  test("shows error when new passwords do not match", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

    renderWithAuth(<EditUserPage />);

    await screen.findByDisplayValue("user1");

    await userEvent.type(screen.getByLabelText(/editUser.currentPassword/i), "oldpass");
    await userEvent.type(screen.getByLabelText(/editUser.newPassword/i), "1234");
    await userEvent.type(screen.getByLabelText(/editUser.confirmPassword/i), "5678");

    const changeButton = screen.getByText("editUser.changePassword");
    await userEvent.click(changeButton);

    await screen.findByText("editUser.passwordMatch");
  });

  test("changes password successfully", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser }); // loadProfile
    mockedAxios.post.mockResolvedValueOnce({}); // changePassword

    renderWithAuth(<EditUserPage />);

    await screen.findByDisplayValue("user1");

    await userEvent.type(screen.getByLabelText(/editUser.currentPassword/i), "oldpass");
    await userEvent.type(screen.getByLabelText(/editUser.newPassword/i), "1234");
    await userEvent.type(screen.getByLabelText(/editUser.confirmPassword/i), "1234");

    const changeButton = screen.getByText("editUser.changePassword");
    await userEvent.click(changeButton);

    await screen.findByText("editUser.passwordChanged");
  });

  test("shows error if changePassword fails", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser }); // loadProfile
    mockedAxios.post.mockRejectedValueOnce({ response: { data: "Password error" } });

    renderWithAuth(<EditUserPage />);

    await screen.findByDisplayValue("user1");

    await userEvent.type(screen.getByLabelText(/editUser.currentPassword/i), "oldpass");
    await userEvent.type(screen.getByLabelText(/editUser.newPassword/i), "1234");
    await userEvent.type(screen.getByLabelText(/editUser.confirmPassword/i), "1234");

    const changeButton = screen.getByText("editUser.changePassword");
    await userEvent.click(changeButton);

    await screen.findByText("Password error");
  });

  test("changePassword: err.response exists but data falsy", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser });
    mockedAxios.post.mockRejectedValueOnce({ response: {}, message: "Password message" });

    renderWithAuth(<EditUserPage />);

    await screen.findByDisplayValue("user1");

    await userEvent.type(screen.getByLabelText(/editUser.currentPassword/i), "oldpass");
    await userEvent.type(screen.getByLabelText(/editUser.newPassword/i), "1234");
    await userEvent.type(screen.getByLabelText(/editUser.confirmPassword/i), "1234");

    await userEvent.click(screen.getByText("editUser.changePassword"));

    await screen.findByText("Password message");
  });

  test("changePassword: err.response undefined, uses err.message", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser });
    mockedAxios.post.mockRejectedValueOnce({ message: "Network password error" });

    renderWithAuth(<EditUserPage />);

    await screen.findByDisplayValue("user1");

    await userEvent.type(screen.getByLabelText(/editUser.currentPassword/i), "oldpass");
    await userEvent.type(screen.getByLabelText(/editUser.newPassword/i), "1234");
    await userEvent.type(screen.getByLabelText(/editUser.confirmPassword/i), "1234");

    await userEvent.click(screen.getByText("editUser.changePassword"));

    await screen.findByText("Network password error");
  });

  test("loadProfile: err.response exists with data", async () => {
    mockedAxios.post.mockRejectedValueOnce({ response: { data: "Loading..." } });

    renderWithAuth(<EditUserPage />);

    await screen.findByText("Loading...");
  });

  test("loadProfile: err.response exists but data falsy", async () => {
    mockedAxios.post.mockRejectedValueOnce({ response: {}, message: "Loading..." });

    renderWithAuth(<EditUserPage />);

    await screen.findByText("Loading...");
  });

  test("loadProfile: err.response undefined, uses err.message", async () => {
    mockedAxios.post.mockRejectedValueOnce({ message: "Loading..." });

    renderWithAuth(<EditUserPage />);

    await screen.findByText("Loading...");
  });

  test("clicking goback button navigates to /", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

    renderWithAuth(<EditUserPage />);

    await screen.findByDisplayValue("user1");

    const goBackButton = screen.getByRole("button", { name: /startScreen.goback/i });
    await userEvent.click(goBackButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("shows error when current password is empty", async () => {
  mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

  renderWithAuth(<EditUserPage />);

  await screen.findByDisplayValue("user1");

  // NO escribimos current password
  await userEvent.type(
    screen.getByLabelText(/editUser.newPassword/i),
    "1234"
  );

  await userEvent.type(
    screen.getByLabelText(/editUser.confirmPassword/i),
    "1234"
  );

  await userEvent.click(screen.getByText("editUser.changePassword"));

  await screen.findByText("editUser.currentPasswordWrong");
});

test("shows error when new password is empty", async () => {
  mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

  renderWithAuth(<EditUserPage />);

  await screen.findByDisplayValue("user1");

  await userEvent.type(
    screen.getByLabelText(/editUser.currentPassword/i),
    "oldpass"
  );

  // new password vacío
  await userEvent.type(
    screen.getByLabelText(/editUser.confirmPassword/i),
    "1234"
  );

  await userEvent.click(screen.getByText("editUser.changePassword"));

  await screen.findByText("editUser.newPasswordRequired");
});

test("updates avatar successfully", async () => {
  mockedAxios.post.mockResolvedValueOnce({ data: mockUser }); // loadProfile
  mockedAxios.post.mockResolvedValueOnce({
    data: { avatar: "new-avatar.png" },
  });

  renderWithAuth(<EditUserPage />);

  await screen.findByDisplayValue("user1");

  const refreshButton = screen.getByRole("button", { name: "⟳" });

  await userEvent.click(refreshButton);

  await waitFor(() =>
    expect(mockedAxios.post).toHaveBeenCalledWith(
      `${API_URL}/api/user/updateAvatar`,
      {},
      { withCredentials: true }
    )
  );
});

test("shows error when avatar update fails", async () => {
  mockedAxios.post.mockResolvedValueOnce({ data: mockUser });
  mockedAxios.post.mockRejectedValueOnce({
    response: { data: "Avatar error" },
  });

  renderWithAuth(<EditUserPage />);

  await screen.findByDisplayValue("user1");

  const refreshButton = screen.getByRole("button", { name: "⟳" });

  await userEvent.click(refreshButton);

  await screen.findByText("Avatar error");
});

test("changePassword shows currentPasswordWrong on 400 error", async () => {
  mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

  mockedAxios.post.mockRejectedValueOnce({
    response: { status: 400 },
  });

  renderWithAuth(<EditUserPage />);

  await screen.findByDisplayValue("user1");

  await userEvent.type(
    screen.getByLabelText(/editUser.currentPassword/i),
    "wrongpass"
  );

  await userEvent.type(
    screen.getByLabelText(/editUser.newPassword/i),
    "Password1"
  );

  await userEvent.type(
    screen.getByLabelText(/editUser.confirmPassword/i),
    "Password1"
  );

  await userEvent.click(screen.getByText("editUser.changePassword"));

  await screen.findByText("editUser.currentPasswordWrong");
});

test("changePassword shows currentPasswordWrong on 401 error", async () => {
  mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

  mockedAxios.post.mockRejectedValueOnce({
    response: { status: 401 },
  });

  renderWithAuth(<EditUserPage />);

  await screen.findByDisplayValue("user1");

  await userEvent.type(
    screen.getByLabelText(/editUser.currentPassword/i),
    "wrongpass"
  );

  await userEvent.type(
    screen.getByLabelText(/editUser.newPassword/i),
    "Password1"
  );

  await userEvent.type(
    screen.getByLabelText(/editUser.confirmPassword/i),
    "Password1"
  );

  await userEvent.click(screen.getByText("editUser.changePassword"));

  await screen.findByText("editUser.currentPasswordWrong");
});

test("shows error using err.response.data fallback", async () => {
  mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

  mockedAxios.post.mockRejectedValueOnce({
    response: { data: "Custom backend error" },
  });

  renderWithAuth(<EditUserPage />);

  await screen.findByDisplayValue("user1");

  await userEvent.click(
    screen.getByText("editUser.updateUsername")
  );

  await screen.findByText("Custom backend error");
});

test("shows error using err.message when response is undefined", async () => {
  mockedAxios.post.mockResolvedValueOnce({ data: mockUser });

  mockedAxios.post.mockRejectedValueOnce({
    message: "Network fallback error",
  });

  renderWithAuth(<EditUserPage />);

  await screen.findByDisplayValue("user1");

  await userEvent.click(
    screen.getByText("editUser.updateUsername")
  );

  await screen.findByText("Network fallback error");
});

});
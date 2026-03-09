import { describe, test, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  getHistory,
  login,
  register,
  getProfile,
  logout
} from "../services/userService";

global.fetch = vi.fn();

vi.mock("axios");

describe("API Service", () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getHistory", () => {

    test("should return game history when request succeeds", async () => {

      const mockHistory = [
        {
          gameId: "game1",
          userId: "123",
          gameMode: "vsBot",
          createdAt: "2024-01-01",
          players: [],
          status: "finished",
          winner: "j1"
        }
      ];

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockHistory
      });

      const result = await getHistory("123");

      expect(fetch).toHaveBeenCalled();
      expect(result).toEqual(mockHistory);
    });

    test("should return empty array when response is not ok", async () => {

      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500
      });

      const result = await getHistory("123");

      expect(result).toEqual([]);
    });

    test("should return empty array when response is not an array", async () => {

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ error: "invalid" })
      });

      const result = await getHistory("123");

      expect(result).toEqual([]);
    });

    test("should return empty array and log error if fetch throws", async () => {

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      (fetch as any).mockRejectedValue(new Error("Network error"));

      const result = await getHistory("123");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching game history:",
        expect.any(Error)
      );

      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

  });

  describe("login", () => {

    test("should login successfully", async () => {

      const mockResponse = { token: "abc123" };

      (axios.post as any).mockResolvedValue({
        data: mockResponse
      });

      const result = await login({
        email: "test@test.com",
        password: "123456"
      });

      expect(axios.post).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

  });

  describe("register", () => {

    test("should register user successfully", async () => {

      const mockResponse = { message: "User created" };

      (axios.post as any).mockResolvedValue({
        data: mockResponse
      });

      const result = await register({
        email: "test@test.com",
        password: "123456"
      });

      expect(axios.post).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    test("should log error if register request fails", async () => {

        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

        (axios.post as any).mockRejectedValue(new Error("Register error"));

        const result = await register({
            email: "test@test.com",
            password: "123456"
        });

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
        expect(result).toBeUndefined();

        consoleSpy.mockRestore();
    });

  });

  describe("getProfile", () => {

    test("should return profile data", async () => {

      const mockProfile = {
        username: "testUser"
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockProfile
      });

      const result = await getProfile();

      expect(fetch).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    test("should throw error if not authenticated", async () => {

      (fetch as any).mockResolvedValue({
        ok: false
      });

      await expect(getProfile()).rejects.toThrow("No autenticado");

    });

  });

  describe("logout", () => {

    test("should logout successfully", async () => {

      const mockResponse = { message: "Logged out" };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await logout();

      expect(fetch).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    test("should throw error if logout fails", async () => {

      (fetch as any).mockResolvedValue({
        ok: false
      });

      await expect(logout()).rejects.toThrow("Error al cerrar sesión");

    });

  });

});
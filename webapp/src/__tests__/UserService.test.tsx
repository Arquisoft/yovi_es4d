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

      const mockHistory = {
        games: [
          {
            gameId: "game1",
            userId: "123",
            gameMode: "vsBot",
            createdAt: "2024-01-01",
            players: [],
            status: "finished",
            winner: "j1"
          }
        ],
        pagination: {
          page: 1,
          limit: 5,
          hasPrev: false,
          hasNext: false,
        },
        summary: {
          totalGames: 1,
          totalWins: 1,
          totalDraws: 0,
          totalLosses: 0,
          winPercentage: 100,
        }
      };

      (axios.get as any).mockResolvedValue({
        data: mockHistory
      });

      const result = await getHistory("123");

      expect(axios.get).toHaveBeenCalled();
      expect(result).toEqual(mockHistory);
    });

    test("should pass pagination and sorting params", async () => {
      (axios.get as any).mockResolvedValue({
        data: { games: [], pagination: {}, summary: {} }
      });

      await getHistory("123", 2, "moves", "asc");

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/game/history"),
        expect.objectContaining({
          params: {
            userId: "123",
            page: 2,
            sortBy: "moves",
            sortOrder: "asc",
          },
          withCredentials: true,
        })
      );
    });

    test("should reject if axios throws", async () => {
      (axios.get as any).mockRejectedValue(new Error("Network error"));

      await expect(getHistory("123")).rejects.toThrow("Network error");
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

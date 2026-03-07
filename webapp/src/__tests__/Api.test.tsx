import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { post } from "../services/api"; // ajusta la ruta

describe("post", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("returns data on successful POST", async () => {
    const mockResponse = { success: true, data: { id: 1 } };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as any);

    const data = { name: "Alice" };
    const result = await post("/users", data);

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/users"), expect.objectContaining({
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }));

    expect(result).toEqual(mockResponse);
  });

  test("throws error if response.ok is false with message", async () => {
    const mockResponse = { error: "Usuario ya existe" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => mockResponse
    } as any);

    await expect(post("/users", { name: "Alice" }))
      .rejects
      .toThrow("Usuario ya existe");
  });

  test("throws generic error if response.ok is false without message", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({})
    } as any);

    await expect(post("/users", { name: "Alice" }))
      .rejects
      .toThrow("Algo salió mal");
  });

  test("throws connection error if fetch fails with TypeError", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(post("/users", { name: "Alice" }))
      .rejects
      .toThrow("No se pudo conectar con el servidor. Asegúrate de que el microservicio de usuarios esté corriendo.");
  });

  test("rethrows other errors", async () => {
    const customError = new Error("Custom error");
    globalThis.fetch = vi.fn().mockRejectedValue(customError);

    await expect(post("/users", { name: "Alice" }))
      .rejects
      .toThrow("Custom error");
  });
});
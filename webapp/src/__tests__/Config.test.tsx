import { describe, test, expect, vi } from "vitest";

describe("config API_URL", () => {

  test("uses localhost when env is missing", async () => {
    vi.resetModules();
    vi.unstubAllEnvs();

    const { API_URL } = await import("../config");

    expect(API_URL).toBe("http://localhost:8000");
  });

  test("uses env variable when defined", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "http://test-api.com");

    const { API_URL } = await import("../config");

    expect(API_URL).toBe("http://test-api.com");
  });

});
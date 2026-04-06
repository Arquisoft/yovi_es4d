import { describe, test, expect, vi } from "vitest";

describe("config API_URL", () => {

  test("uses localhost when env is missing", async () => {
    vi.resetModules();
    vi.unstubAllEnvs();

    const { API_URL } = await import("../config");

    expect(API_URL).toBe("http://20.188.62.231:8000");
  });

});
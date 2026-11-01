import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getServerApiKey, isPlaceholderCredential } from "./serverKey";

describe("Server-Side API Key Resolution & Validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.SAYRA_API_KEY;
    delete process.env.PLAYNEST_API_KEY;
    delete process.env.STATIC_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("identifies placeholder credentials accurately", () => {
    expect(isPlaceholderCredential("<YOUR_STATIC_API_KEY_MIN_10_CHARS>")).toBe(true);
    expect(isPlaceholderCredential("your_static_api_key_min_10_chars")).toBe(true);
    expect(isPlaceholderCredential("<some_fake_key>")).toBe(true);
    expect(isPlaceholderCredential("placeholder")).toBe(true);
    expect(isPlaceholderCredential("valid-secret-key-1234567890")).toBe(false);
  });

  it("selects SAYRA_API_KEY as highest priority", () => {
    process.env.SAYRA_API_KEY = "sayra-key-1";
    process.env.PLAYNEST_API_KEY = "playnest-key-2";
    process.env.STATIC_API_KEY = "static-key-3";

    const res = getServerApiKey();
    expect(res.key).toBe("sayra-key-1");
    expect(res.error).toBeUndefined();
  });

  it("selects PLAYNEST_API_KEY if SAYRA_API_KEY is not defined", () => {
    delete process.env.SAYRA_API_KEY;
    process.env.PLAYNEST_API_KEY = "playnest-key-2";
    process.env.STATIC_API_KEY = "static-key-3";

    const res = getServerApiKey();
    expect(res.key).toBe("playnest-key-2");
  });

  it("selects STATIC_API_KEY if SAYRA and PLAYNEST are not defined", () => {
    delete process.env.SAYRA_API_KEY;
    delete process.env.PLAYNEST_API_KEY;
    process.env.STATIC_API_KEY = "static-key-3";

    const res = getServerApiKey();
    expect(res.key).toBe("static-key-3");
  });

  it("returns explicit error if no API key is configured", () => {
    delete process.env.SAYRA_API_KEY;
    delete process.env.PLAYNEST_API_KEY;
    delete process.env.STATIC_API_KEY;

    const res = getServerApiKey();
    expect(res.key).toBeNull();
    expect(res.error).toContain("MISSING_API_KEY");
  });

  it("rejects placeholder credentials and returns explicit error", () => {
    process.env.STATIC_API_KEY = "<YOUR_STATIC_API_KEY_MIN_10_CHARS>";

    const res = getServerApiKey();
    expect(res.key).toBeNull();
    expect(res.error).toContain("INVALID_API_KEY");
  });
});

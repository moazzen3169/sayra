/**
 * Server-side API Key & Upstream Resolution
 * Central resolution logic prioritizing:
 * 1. SAYRA_API_KEY
 * 2. PLAYNEST_API_KEY
 * 3. STATIC_API_KEY
 *
 * Rejects placeholder credentials and ensures secrets are resolved only on server.
 */

const KNOWN_PLACEHOLDERS = new Set([
  "<your_static_api_key_min_10_chars>",
  "your_static_api_key_min_10_chars",
  "your_api_key",
  "changeme",
  "replace_me",
  "placeholder",
]);

export function isPlaceholderCredential(val: string): boolean {
  const normalized = val.trim().toLowerCase();
  if (KNOWN_PLACEHOLDERS.has(normalized)) return true;
  if (normalized.startsWith("<") && normalized.endsWith(">")) return true;
  return false;
}

export function getServerApiKey(): { key: string | null; error?: string } {
  const rawKey =
    process.env.SAYRA_API_KEY ||
    process.env.PLAYNEST_API_KEY ||
    process.env.STATIC_API_KEY ||
    null;

  if (!rawKey || !rawKey.trim()) {
    return {
      key: null,
      error: "MISSING_API_KEY: Server environment variable (SAYRA_API_KEY, PLAYNEST_API_KEY, or STATIC_API_KEY) is not configured.",
    };
  }

  const trimmed = rawKey.trim();
  if (isPlaceholderCredential(trimmed)) {
    return {
      key: null,
      error: "INVALID_API_KEY: The configured API key is a placeholder and not a verified secret.",
    };
  }

  return { key: trimmed };
}

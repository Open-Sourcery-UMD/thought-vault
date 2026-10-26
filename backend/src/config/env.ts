// Centralized env access for auth. Validated eagerly at import time so the
// process fails fast on startup instead of on the first request.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const jwtSecret = requireEnv("JWT_SECRET");
if (jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET must be at least 32 characters long. Generate one with `openssl rand -hex 32`."
  );
}

export const env = {
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
};

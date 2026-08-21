import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/session";

// Aligned with the backend's default JWT expiry (24h) — see ing-backend's
// auth contract. If the token expires sooner server-side, apiFetch() will
// still catch it via the 401 response and redirect to /connexion.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

import { redirect } from "next/navigation";

import { getSessionToken } from "@/lib/auth";

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

/**
 * Authenticated fetch helper for server components/actions calling
 * `/companies/**` (or any other endpoint that requires a session).
 *
 * Reads the session cookie, attaches it as `Authorization: Bearer <token>`,
 * and centralizes the "no token" / "expired or invalid token" (401) case by
 * redirecting to /connexion — callers don't need to repeat that check.
 *
 * A 403 (token valid but wrong company) is returned as-is: callers already
 * fall back gracefully via `res.ok` checks, which is the correct behaviour
 * for a case that should never happen through normal UI navigation.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getSessionToken();

  if (!token) {
    redirect("/connexion");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (res.status === 401) {
    redirect("/connexion");
  }

  return res;
}

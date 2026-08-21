// Shared cookie name, kept in its own module (no `next/headers` / `server-only`
// imports) so it can be safely imported from both server components/actions
// (via lib/auth.ts) and the edge/node proxy (src/proxy.ts).
export const SESSION_COOKIE_NAME = "copilote_session";

"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, Card } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <p className="rounded-lg border border-danger-border bg-danger-muted p-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Card className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            Courriel
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Connexion..." : "Se connecter"}
        </Button>
      </Card>

      <p className="text-sm text-foreground-muted">
        Pas encore de compte ?{" "}
        <Link href="/entreprises/nouvelle" className="text-accent hover:underline">
          Créer mon entreprise
        </Link>
      </p>
    </form>
  );
}

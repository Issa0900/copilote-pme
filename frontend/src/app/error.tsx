"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui";

export default function RootErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center p-6 text-center sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-danger">Erreur</p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">
        Impossible d&apos;afficher cette page
      </h1>
      <p className="mt-2 max-w-md text-sm text-foreground-muted">
        Le serveur est peut-être temporairement injoignable. Vérifiez votre
        connexion, puis réessayez.
      </p>
      <div className="mt-6">
        <Button onClick={() => retry()}>Réessayer</Button>
      </div>
    </main>
  );
}

"use client";

import { useEffect } from "react";

import { Button, LinkButton } from "@/components/ui";

export default function CompanyErrorBoundary({
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
        Impossible de charger cette entreprise
      </h1>
      <p className="mt-2 max-w-md text-sm text-foreground-muted">
        Le serveur est peut-être temporairement injoignable. Réessayez, ou
        revenez au tableau de bord de votre entreprise.
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={() => retry()}>Réessayer</Button>
        <LinkButton href="/entreprises" variant="secondary">
          ← Mon entreprise
        </LinkButton>
      </div>
    </main>
  );
}

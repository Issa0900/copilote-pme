import { LinkButton } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground-muted">
        MVP
      </span>
      <h1 className="text-4xl font-semibold tracking-tight">Gescop</h1>
      <p className="max-w-md text-foreground-muted">
        Connectez les données de votre entreprise et obtenez un diagnostic, des
        alertes et des recommandations.
      </p>
      <div className="flex gap-3">
        <LinkButton href="/entreprises/nouvelle" variant="primary">
          Créer mon entreprise
        </LinkButton>
        <LinkButton href="/connexion" variant="secondary">
          Se connecter
        </LinkButton>
      </div>
    </main>
  );
}

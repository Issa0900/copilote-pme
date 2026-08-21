import { PageHeader } from "@/components/ui";
import { LoginForm } from "./login-form";

export default function ConnexionPage() {
  return (
    <main className="mx-auto w-full max-w-md p-6 sm:p-8">
      <PageHeader
        title="Connexion"
        subtitle="Accédez au tableau de bord de votre entreprise."
      />
      <LoginForm />
    </main>
  );
}

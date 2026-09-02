import { Card, PageHeader } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Company, CompanyOptions } from "@/lib/types";
import { CompanySettingsForm } from "./company-settings-form";

export default async function CompanySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [companyRes, optionsRes] = await Promise.all([
    apiFetch(`/companies/${id}`),
    apiFetch(`/meta/company-options`),
  ]);

  // Les deux appels sont indispensables au formulaire, pour deux raisons
  // différentes (spec §64.22) :
  //  - sans l'entreprise, il n'y a rien à pré-remplir ;
  //  - sans la liste des options, la case « Objectifs » s'afficherait vide et
  //    le menu « Chiffre d'affaires » sans choix. Le dirigeant croirait
  //    qu'aucun objectif n'est configuré, et surtout un enregistrement
  //    renverrait `objectives: []` / `revenue_range: null`, effaçant sa
  //    configuration réelle. On préfère donc ne pas afficher le formulaire.
  const company: Company | null = companyRes.ok ? await companyRes.json() : null;
  const options: CompanyOptions | null = optionsRes.ok ? await optionsRes.json() : null;

  return (
    <div>
      <PageHeader
        title="Paramètres"
        subtitle="Les informations de votre entreprise, utilisées pour orienter les recommandations du système."
      />
      {!company || !options ? (
        <Card tone="danger">
          <p className="text-sm font-medium">
            Impossible de charger vos paramètres.
          </p>
          <p className="mt-1 text-sm opacity-90">
            Le serveur n&apos;a pas répondu : cet écran ne montre pas votre
            configuration actuelle, il n&apos;a pas pu la lire. Le formulaire
            est volontairement masqué — pré-rempli de valeurs incomplètes, un
            enregistrement risquerait d&apos;effacer vos réglages réels.{" "}
            <a href={`/entreprises/${id}/parametres`} className="underline">
              Recharger la page
            </a>
            . Si l&apos;erreur persiste, vérifiez votre connexion réseau, puis
            signalez-la à votre administrateur en précisant l&apos;heure.
          </p>
        </Card>
      ) : (
        <CompanySettingsForm company={company} options={options} />
      )}
    </div>
  );
}

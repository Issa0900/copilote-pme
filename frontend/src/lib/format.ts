/**
 * `currency` : code ISO 4217 de l'entreprise (`Company.currency`, spec
 * §64.3/§64.6/§64.8) — à transmettre partout où il est disponible. Le défaut
 * "CAD" ne couvre qu'un appel qui n'aurait pas encore accès à l'entreprise ;
 * il ne doit jamais masquer un oubli de fil de devise sur un nouvel écran.
 * La locale reste "fr-CA" indépendamment de la devise : l'interface entière
 * est en français, `Intl.NumberFormat` sait déjà placer le symbole et les
 * décimales propres à chaque devise dans cette locale (ex. "1 234,00 $US").
 */
export function formatCurrency(value: number, currency: string = "CAD"): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string): string {
  // Accepte une date seule (YYYY-MM-DD) comme un horodatage complet
  // (2026-09-02T00:19:48Z) : plusieurs champs de l'API sont des datetimes
  // (`uploaded_at`, `generated_at`), et n'en garder que la partie date évite
  // un `Invalid time value` sur ces valeurs-là.
  //
  // La partie date est ensuite décomposée à la main plutôt que passée à
  // `new Date(value)`, qui l'interpréterait comme minuit UTC et pourrait
  // reculer d'un jour la date affichée dans les fuseaux derrière UTC.
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    // Plutôt que de faire planter tout l'écran sur une date inattendue,
    // afficher la valeur brute — elle reste lisible et diagnosticable.
    return value;
  }

  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

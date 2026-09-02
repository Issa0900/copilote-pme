export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
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

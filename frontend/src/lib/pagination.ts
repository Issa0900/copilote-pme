/**
 * Lecture de la pagination du backend (spec §64.24).
 *
 * Les listes de l'API renvoient toujours un tableau JSON, mais bornent
 * silencieusement le nombre d'éléments et publient le total réel dans
 * l'en-tête `X-Total-Count`. Sans lire cet en-tête, un écran affiche un début
 * de liste en le présentant comme la totalité — exactement l'affirmation non
 * vérifiée que le produit s'interdit (PRD §44).
 */

/** Tailles de page appliquées par défaut côté backend, liste par liste. */
export const PAGE_SIZES = {
  imports: 100,
  importTransactions: 200,
  recommendations: 100,
  alerts: 50,
} as const;

export type PageInfo = {
  /** Décalage demandé (`?offset=`). */
  offset: number;
  /** Taille de page attendue du backend. */
  limit: number;
  /** Nombre d'éléments réellement reçus. */
  received: number;
  /** Total publié par `X-Total-Count`, ou `null` si l'en-tête est absent ou illisible. */
  total: number | null;
  /** `true` quand ce qui est affiché n'est qu'une partie de la liste. */
  truncated: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  /** Rang du premier élément affiché, en base 1 (0 si la page est vide). */
  first: number;
  /** Rang du dernier élément affiché, en base 1 (0 si la page est vide). */
  last: number;
};

const COUNT_FORMATTER = new Intl.NumberFormat("fr-CA");

export function formatCount(value: number): string {
  return COUNT_FORMATTER.format(value);
}

/** `?offset=` est saisissable à la main : toute valeur non entière ou négative
 * retombe sur 0 plutôt que d'être transmise telle quelle au backend. */
export function parseOffset(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export function readPageInfo(
  res: Response,
  received: number,
  offset: number,
  limit: number
): PageInfo {
  const header = res.headers.get("x-total-count");
  const parsed = header === null ? Number.NaN : Number(header);
  const total = Number.isInteger(parsed) && parsed >= 0 ? parsed : null;

  // Sans en-tête exploitable, on ne peut ni chiffrer ce qui manque ni affirmer
  // que la liste est complète : une page pleine est alors considérée comme
  // potentiellement tronquée, jamais comme exhaustive.
  const truncated = total !== null ? received < total : received >= limit;
  const hasNext = total !== null ? offset + received < total : received >= limit;

  return {
    offset,
    limit,
    received,
    total,
    truncated,
    hasPrevious: offset > 0,
    hasNext,
    first: received === 0 ? 0 : offset + 1,
    last: offset + received,
  };
}

/** Construit l'URL d'une page en conservant les autres paramètres d'URL. */
export function pageHref(
  basePath: string,
  offset: number,
  query?: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, value);
  }
  if (offset > 0) params.set("offset", String(offset));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

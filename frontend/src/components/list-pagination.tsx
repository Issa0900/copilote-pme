import { LinkButton } from "@/components/ui";
import { formatCount, pageHref, type PageInfo } from "@/lib/pagination";

/**
 * Bandeau de navigation d'une liste paginée par le backend.
 *
 * Il dit à l'écran, en clair, quelle portion de la liste est affichée : tant
 * qu'une liste tronquée passe pour complète, le dirigeant peut conclure à tort
 * qu'il a tout vu (PRD §44, spec §64.24).
 *
 * Ne rend rien quand la page affiche réellement l'intégralité de la liste —
 * l'écran n'a alors rien de plus à signaler.
 */
export function ListPagination({
  page,
  basePath,
  query,
  label,
  note,
}: {
  page: PageInfo;
  /** Chemin de la page courante, sans paramètres. */
  basePath: string;
  /** Paramètres d'URL à conserver d'une page à l'autre. */
  query?: Record<string, string | undefined>;
  /** Nom au pluriel de ce qui est listé : « lignes », « alertes »… */
  label: string;
  /** Précision propre à l'écran, affichée sous la phrase tant qu'il reste des
   * éléments après ceux affichés. */
  note?: string;
}) {
  if (!page.truncated && !page.hasPrevious) return null;

  const previousOffset = Math.max(0, page.offset - page.limit);
  const nextOffset = page.offset + page.limit;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm">
          {page.total !== null ? (
            <>
              Vous voyez les {label}{" "}
              <span className="font-mono">{formatCount(page.first)}</span> à{" "}
              <span className="font-mono">{formatCount(page.last)}</span> sur{" "}
              <span className="font-mono">{formatCount(page.total)}</span> au total.
            </>
          ) : (
            <>
              Vous voyez les {label}{" "}
              <span className="font-mono">{formatCount(page.first)}</span> à{" "}
              <span className="font-mono">{formatCount(page.last)}</span>. Le nombre
              total n&apos;a pas pu être établi : cette liste n&apos;est
              peut-être pas complète.
            </>
          )}
        </p>
        {/* Sur la dernière page, promettre « la suite » serait faux : ce qui
            manque est derrière, pas devant. */}
        <p className="mt-1 text-xs text-foreground-muted">
          {page.hasNext
            ? (note ??
              "Cet écran n'affiche qu'une partie de la liste — passez à la page suivante pour voir la suite.")
            : "Fin de la liste. Les éléments précédents ne sont pas affichés ici — revenez à la page précédente pour les revoir."}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {page.hasPrevious ? (
          <LinkButton
            href={pageHref(basePath, previousOffset, query)}
            variant="secondary"
            size="sm"
          >
            Page précédente
          </LinkButton>
        ) : (
          <span className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-muted opacity-50">
            Page précédente
          </span>
        )}
        {page.hasNext ? (
          <LinkButton
            href={pageHref(basePath, nextOffset, query)}
            variant="secondary"
            size="sm"
          >
            Page suivante
          </LinkButton>
        ) : (
          <span className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs text-foreground-muted opacity-50">
            Page suivante
          </span>
        )}
      </div>
    </div>
  );
}

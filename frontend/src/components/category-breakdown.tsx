import { formatCurrency } from "@/lib/format";

type Item = { category: string; total: number };

export function CategoryBreakdown({ items }: { items: Item[] }) {
  if (items.length === 0) return null;

  const max = Math.max(...items.map((i) => i.total), 1);

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.category}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span>{item.category}</span>
            <span className="font-mono tabular-nums text-foreground-muted">
              {formatCurrency(item.total)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max((item.total / max) * 100, 3)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

# Composants de départ

Partir de ces composants plutôt que d'improviser des équivalents à chaque écran — c'est ce qui garde une identité cohérente entre des maquettes générées à des moments différents. Styles en ligne délibérément (voir la contrainte technique dans SKILL.md : les classes Tailwind arbitraires ne sont pas compilées dans cet environnement). Les classes Tailwind de base restent utilisables autour de ces composants pour la mise en page (`flex`, `gap-4`, `p-6`, etc.).

```jsx
const tokens = {
  ink: '#121820',
  paper: '#F1F3F1',
  surface: '#FFFFFF',
  border: '#DCE0DD',
  muted: '#5B6660',
  accent: '#1B6E62',
  font: "'IBM Plex Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
  status: {
    critique: '#A23B2E',
    important: '#A6650A',
    surveillance: '#8C7A2A',
    opportunite: '#2E7D4F',
    information: '#3D6482',
  },
};

const statusLabels = {
  critique: 'Critique',
  important: 'Important',
  surveillance: 'Surveillance',
  opportunite: 'Opportunité',
  information: 'Information',
};

const trustLabels = {
  fait: 'Fait',
  analyse: 'Analyse',
  hypothese: 'Hypothèse',
  recommandation: 'Recommandation',
  prevision: 'Prévision',
};

// Pastille + libellé pour un niveau d'alerte (jamais un emoji brut à l'écran).
function StatusBadge({ level, label }) {
  const color = tokens.status[level];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: tokens.font, fontSize: 12, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.04em', color,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      {label || statusLabels[level]}
    </span>
  );
}

// Étiquette de fiabilité épistémique — obligatoire sur toute affirmation générée par le système.
function TrustBadge({ type }) {
  return (
    <span style={{
      fontFamily: tokens.font, fontSize: 11, fontWeight: 500,
      textTransform: 'uppercase', letterSpacing: '0.05em', color: tokens.muted,
      border: `1px solid ${tokens.border}`, borderRadius: 3, padding: '2px 6px',
      whiteSpace: 'nowrap',
    }}>
      {trustLabels[type]}
    </span>
  );
}

// Jauge horizontale graduée — remplace toute jauge circulaire ou donut chart.
function GaugeBar({ label, value, max = 100, level = 'information' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = tokens.status[level] || tokens.accent;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: tokens.font, fontSize: 13, color: tokens.ink }}>{label}</span>
        <span style={{ fontFamily: tokens.mono, fontSize: 13, fontWeight: 600, color: tokens.ink }}>
          {value}{max === 100 ? '' : ` / ${max}`}
        </span>
      </div>
      <div style={{ position: 'relative', height: 6, background: tokens.border, borderRadius: 3 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
          background: color, borderRadius: 3, transition: 'width 0.3s ease',
        }} />
        {[25, 50, 75].map((t) => (
          <div key={t} style={{
            position: 'absolute', left: `${t}%`, top: -2, width: 1, height: 10,
            background: tokens.paper,
          }} />
        ))}
      </div>
    </div>
  );
}

// Carte de base avec rail de statut optionnel.
function Card({ statusLevel, children, style }) {
  const borderColor = statusLevel ? tokens.status[statusLevel] : tokens.border;
  return (
    <div style={{
      background: tokens.surface,
      borderRadius: 6,
      border: `1px solid ${tokens.border}`,
      borderLeft: `4px solid ${borderColor}`,
      padding: '16px 18px',
      ...style,
    }}>
      {children}
    </div>
  );
}

// Chiffre clé (KPI) — toujours en IBM Plex Mono.
function KPITile({ label, value, delta }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: tokens.font, fontSize: 12, color: tokens.muted }}>{label}</span>
      <span style={{ fontFamily: tokens.mono, fontSize: 22, fontWeight: 600, color: tokens.ink }}>{value}</span>
      {delta ? (
        <span style={{ fontFamily: tokens.mono, fontSize: 12, color: delta.startsWith('-') ? tokens.status.critique : tokens.status.opportunite }}>
          {delta}
        </span>
      ) : null}
    </div>
  );
}
```

## Import des polices (artifact HTML)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
```

En React, charger les mêmes familles via une balise `<style>` injectée en tête d'artifact avec le même `@import`, ou s'appuyer sur `ui-monospace` en repli pour les chiffres si le chargement externe échoue.

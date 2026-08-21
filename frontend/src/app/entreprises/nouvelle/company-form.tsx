"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button, Card } from "@/components/ui";
import type { CompanyOptions } from "@/lib/types";
import { createCompanyAction, type CreateCompanyState } from "./actions";

const initialState: CreateCompanyState = {};

export function CompanyForm({ options }: { options: CompanyOptions }) {
  const [state, formAction, pending] = useActionState(
    createCompanyAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <p className="rounded-lg border border-danger-border bg-danger-muted p-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Card className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'entreprise" name="name" required />
          <Field label="Secteur" name="sector" required />
          <Field label="Localisation" name="location" required />
          <Field
            label="Nombre d'employés"
            name="employees"
            type="number"
            min={0}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modèle d'affaires" name="business_model" />
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="revenue_range"
            >
              Chiffre d&apos;affaires (fourchette)
            </label>
            <select
              id="revenue_range"
              name="revenue_range"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">—</option>
              {options.revenue_ranges.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TextArea label="Produits" name="products" />
        <TextArea label="Services" name="services" />
        <TextArea label="Clientèle" name="customers" />
        <TextArea label="Fournisseurs" name="suppliers" />
        <TextArea label="Outils utilisés" name="tools_used" />

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Objectifs</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.objectives.map((objective) => (
              <label
                key={objective.value}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="objectives"
                  value={objective.value}
                  className="accent-accent"
                />
                {objective.label}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="space-y-4">
        <p className="text-sm font-medium">Votre compte</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Courriel"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <Field
            label="Mot de passe"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <p className="text-xs text-foreground-muted">
          Au moins 8 caractères. Ce compte sera le premier accès à cette
          entreprise.
        </p>

        <Button type="submit" disabled={pending}>
          {pending ? "Création..." : "Créer mon entreprise et mon compte"}
        </Button>
      </Card>

      <p className="text-sm text-foreground-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  min,
  minLength,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: number;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor={name}>
        {label}
        {required && " *"}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
    </div>
  );
}

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={2}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
    </div>
  );
}

"use client";

import { useActionState } from "react";

import { Button, Card } from "@/components/ui";
import type { Company, CompanyOptions } from "@/lib/types";
import { updateCompanyAction, type UpdateCompanyState } from "./actions";

const initialState: UpdateCompanyState = {};

export function CompanySettingsForm({
  company,
  options,
}: {
  company: Company;
  options: CompanyOptions;
}) {
  const action = updateCompanyAction.bind(null, company.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <p className="rounded-lg border border-danger-border bg-danger-muted p-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {!state?.error && state?.success && (
        <p className="rounded-lg border border-success-border bg-success-muted p-3 text-sm text-success">
          {state.success}
        </p>
      )}

      <Card className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'entreprise" name="name" defaultValue={company.name} required />
          <Field label="Secteur" name="sector" defaultValue={company.sector} required />
          <Field label="Localisation" name="location" defaultValue={company.location} required />
          <Field
            label="Nombre d'employés"
            name="employees"
            type="number"
            min={0}
            defaultValue={String(company.employees)}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Modèle d'affaires"
            name="business_model"
            defaultValue={company.business_model ?? ""}
          />
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="revenue_range">
              Chiffre d&apos;affaires (fourchette)
            </label>
            <select
              id="revenue_range"
              name="revenue_range"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              defaultValue={company.revenue_range ?? ""}
            >
              <option value="">—</option>
              {options.revenue_ranges.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="currency">
              Devise
            </label>
            <select
              id="currency"
              name="currency"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              defaultValue={company.currency}
            >
              {options.currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-foreground-muted">
              Utilisée pour afficher tous les montants. Ne convertit pas des
              transactions dans plusieurs devises.
            </p>
          </div>
        </div>

        <TextArea label="Produits" name="products" defaultValue={company.products ?? ""} />
        <TextArea label="Services" name="services" defaultValue={company.services ?? ""} />
        <TextArea label="Clientèle" name="customers" defaultValue={company.customers ?? ""} />
        <TextArea label="Fournisseurs" name="suppliers" defaultValue={company.suppliers ?? ""} />
        <TextArea label="Outils utilisés" name="tools_used" defaultValue={company.tools_used ?? ""} />

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Objectifs</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.objectives.map((objective) => (
              <label key={objective.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="objectives"
                  value={objective.value}
                  defaultChecked={company.objectives?.includes(objective.value) ?? false}
                  className="accent-accent"
                />
                {objective.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </Card>

      {/* Seuils de pilotage : ce sont eux qui déterminent le score de santé et
          les objectifs affichés au tableau de bord. Regroupés à part et
          explicités, pour que le dirigeant sache exactement ce qu'il règle. */}
      <Card className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold">Seuils de pilotage</h2>
          <p className="mt-1 text-xs text-foreground-muted">
            Ces valeurs servent de repère au score de santé et aux objectifs du
            tableau de bord. Une marge de 18 % n&apos;a pas le même sens en
            restauration qu&apos;en logiciel — à vous de fixer la vôtre.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Marge nette visée (%)"
            name="target_margin_pct"
            type="number"
            min={1}
            defaultValue={String(company.target_margin_pct)}
            hint="Au-delà, la rentabilité est notée au maximum."
          />
          <Field
            label="Seuil « situation saine » (score /100)"
            name="health_healthy_threshold"
            type="number"
            min={10}
            defaultValue={String(company.health_healthy_threshold)}
            hint="Score global à partir duquel la situation est jugée saine."
          />
          <Field
            label="Objectif de revenus ($)"
            name="revenue_target"
            type="number"
            min={0}
            defaultValue={company.revenue_target !== null ? String(company.revenue_target) : ""}
            hint="Optionnel — affiché en repère sur la carte Revenus."
          />
          <Field
            label="Budget de dépenses ($)"
            name="expense_budget"
            type="number"
            min={0}
            defaultValue={company.expense_budget !== null ? String(company.expense_budget) : ""}
            hint="Optionnel — affiché en repère sur la carte Dépenses."
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer les seuils"}
        </Button>
      </Card>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  min,
  defaultValue,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: number;
  defaultValue?: string;
  hint?: string;
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
        step={type === "number" ? "any" : undefined}
        defaultValue={defaultValue}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-[11px] text-foreground-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={2}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
    </div>
  );
}

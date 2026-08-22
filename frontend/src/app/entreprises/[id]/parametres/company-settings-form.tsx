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
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: number;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
      />
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

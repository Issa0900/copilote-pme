"use client";

import { useActionState, useState, type FormEvent } from "react";

import { Button } from "@/components/ui";
import { uploadImportAction, type UploadImportState } from "./actions";

const initialState: UploadImportState = {};

// Aligné sur MAX_IMPORT_FILE_SIZE côté backend (backend/app/routers/imports.py).
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function formatMo(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export function UploadForm({ companyId }: { companyId: string }) {
  const action = uploadImportAction.bind(null, companyId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      event.preventDefault();
      setClientError(`Fichier trop volumineux (${formatMo(file.size)} Mo, max 10 Mo).`);
    }
  }

  const error = clientError ?? state?.error;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="rounded-lg border border-danger-border bg-danger-muted p-3 text-sm text-danger">
          {error}
        </p>
      )}
      {!error && state?.success && (
        <p className="rounded-lg border border-success-border bg-success-muted p-3 text-sm text-success">
          {state.success}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,.tsv,.xlsx,.xls,.pdf"
          required
          onChange={() => setClientError(null)}
          className="text-sm text-foreground-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Import..." : "Importer"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui";
import { uploadImportAction, type UploadImportState } from "./actions";

const initialState: UploadImportState = {};

export function UploadForm({ companyId }: { companyId: string }) {
  const action = uploadImportAction.bind(null, companyId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && (
        <p className="rounded-lg border border-danger-border bg-danger-muted p-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.success && (
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
          className="text-sm text-foreground-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Import..." : "Importer"}
        </Button>
      </div>
    </form>
  );
}

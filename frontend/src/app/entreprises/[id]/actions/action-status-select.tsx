"use client";

import { useActionState, useRef } from "react";

import { ACTION_STATUS_LABELS, ACTION_STATUS_ORDER } from "@/lib/action-status";
import type { ActionStatus } from "@/lib/types";
import { updateActionStatusAction, type UpdateActionState } from "./actions";

const initialState: UpdateActionState = {};

export function ActionStatusSelect({
  companyId,
  actionId,
  status,
}: {
  companyId: string;
  actionId: string;
  status: ActionStatus;
}) {
  const boundAction = updateActionStatusAction.bind(null, companyId, actionId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={formAction} ref={formRef} className="shrink-0">
      {state?.error && (
        <p className="mb-1 text-xs text-danger">{state.error}</p>
      )}
      <select
        name="status"
        defaultValue={status}
        disabled={pending}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Statut de l'action"
        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs disabled:opacity-60"
      >
        {ACTION_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {ACTION_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}

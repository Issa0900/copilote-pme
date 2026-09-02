"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui";
import {
  createActionFromRecommendationAction,
  setRecommendationStatusAction,
  type CreateActionState,
  type SetRecommendationStatusState,
} from "./actions";

const initialState: SetRecommendationStatusState = {};
const initialCreateActionState: CreateActionState = {};

export function RecommendationActions({
  companyId,
  recommendationId,
}: {
  companyId: string;
  recommendationId: string;
}) {
  const acceptAction = setRecommendationStatusAction.bind(
    null,
    companyId,
    recommendationId,
    "acceptee"
  );
  const rejectAction = setRecommendationStatusAction.bind(
    null,
    companyId,
    recommendationId,
    "rejetee"
  );
  const createActionAction = createActionFromRecommendationAction.bind(
    null,
    companyId,
    recommendationId
  );

  const [acceptState, acceptFormAction, acceptPending] = useActionState(
    acceptAction,
    initialState
  );
  const [rejectState, rejectFormAction, rejectPending] = useActionState(
    rejectAction,
    initialState
  );
  const [createActionState, createActionFormAction, createActionPending] = useActionState(
    createActionAction,
    initialCreateActionState
  );

  const pending = acceptPending || rejectPending || createActionPending;
  const error = acceptState?.error ?? rejectState?.error ?? createActionState?.error;

  return (
    <div>
      {error && (
        <p className="mb-2 rounded-lg border border-danger-border bg-danger-muted p-2 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {/* Créer une action décide aussi d'agir : elle passe la
            recommandation à "acceptee" côté backend (spec §64.15 distingue
            « accepter » et « créer une tâche », mais laisser les deux
            boutons actifs en même temps ferait croire qu'on peut créer une
            action SANS avoir accepté). */}
        <form action={createActionFormAction}>
          <Button type="submit" size="sm" disabled={pending}>
            {createActionPending ? "..." : "Créer une action"}
          </Button>
        </form>
        <form action={acceptFormAction}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={pending}
          >
            {acceptPending ? "..." : "Accepter"}
          </Button>
        </form>
        <form action={rejectFormAction}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={pending}
          >
            {rejectPending ? "..." : "Rejeter"}
          </Button>
        </form>
      </div>
    </div>
  );
}

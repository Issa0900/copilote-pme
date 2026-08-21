"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui";
import {
  setRecommendationStatusAction,
  type SetRecommendationStatusState,
} from "./actions";

const initialState: SetRecommendationStatusState = {};

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

  const [acceptState, acceptFormAction, acceptPending] = useActionState(
    acceptAction,
    initialState
  );
  const [rejectState, rejectFormAction, rejectPending] = useActionState(
    rejectAction,
    initialState
  );

  const error = acceptState?.error ?? rejectState?.error;

  return (
    <div>
      {error && (
        <p className="mb-2 rounded-lg border border-danger-border bg-danger-muted p-2 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <form action={acceptFormAction}>
          <Button type="submit" size="sm" disabled={acceptPending || rejectPending}>
            {acceptPending ? "..." : "Accepter"}
          </Button>
        </form>
        <form action={rejectFormAction}>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={acceptPending || rejectPending}
          >
            {rejectPending ? "..." : "Rejeter"}
          </Button>
        </form>
      </div>
    </div>
  );
}

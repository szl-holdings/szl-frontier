// SPDX-License-Identifier: Apache-2.0
/** Auth-gated, read-only decision analysis; never an execution endpoint. */
import { createFileRoute } from "@tanstack/react-router";
import { assertSameSiteRequest } from "@/lib/auth/isolation.server";
import { requireUserId } from "@/lib/auth/verify.server";
import { boundedJson, PreviewHttpError } from "@/lib/actions/bounded-json";
import {
  COUNTERFACTUAL_SCHEMA,
  counterfactualCertificate,
  parsePreviewInput,
} from "@/lib/actions/counterfactual";

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-szl-kind": "counterfactual-read-only",
      "x-szl-production-authorization": "false",
      "x-szl-execution-authorized": "false",
      "x-szl-effect-committed": "false",
      "x-szl-authority": "NONE",
    },
  });
}

export const Route = createFileRoute("/api/action-preview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertSameSiteRequest();
          // A caller selects hypothetical inputs, never their principal or authority.
          const userId = await requireUserId();
          const input = parsePreviewInput(await boundedJson(request));
          if (!input) return response({
            schema: COUNTERFACTUAL_SCHEMA, state: "REJECTED",
            reason: "INVALID_SCENARIO", executionAuthorized: false,
          }, 400);
          return response(await counterfactualCertificate(input, userId), 200);
        } catch (error) {
          const status = error instanceof PreviewHttpError
            ? error.status : error instanceof Error && "status" in error &&
              typeof error.status === "number" && [401, 403, 503].includes(error.status)
              ? error.status : 503;
          return response({
            schema: COUNTERFACTUAL_SCHEMA,
            state: "REJECTED",
            reason: error instanceof PreviewHttpError ? error.message :
              status === 401 ? "UNAUTHENTICATED" :
              status === 403 ? "CROSS_SITE_BLOCKED" : "SERVER_AUTH_OR_EVIDENCE_UNAVAILABLE",
            executionAuthorized: false,
          }, status);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { buildReceiptFromCsv, FLOTATION_SCHEMA } from "@/lib/frontier/flotation";

const MAX_BODY = 256 * 1024;

export const Route = createFileRoute("/api/flotation")({
  server: {
    handlers: {
      GET: async () =>
        jsonResponse({
          schema: FLOTATION_SCHEMA,
          method: "POST",
          productionAuthorization: false,
          trainingAdmission: false,
          energyClass: "UNAVAILABLE",
          recoveryPercent: null,
          selectivity: "MODELED",
          note: "POST { table?: csv, bench?: csv, scoreColumn?: string, features?: object, weights?: object, tau?: number }. Rank a declared public score and/or emit an abstaining unitless prior. Recovery percent stays null. exhibitOnApex stays false.",
        }),
      POST: async ({ request }) => {
        const length = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(length) && length > MAX_BODY) {
          return jsonResponse(
            {
              schema: FLOTATION_SCHEMA,
              state: "REJECTED",
              diagnostic: "BODY_TOO_LARGE",
              recoveryPercent: null,
              productionAuthorization: false,
            },
            413,
          );
        }
        const text = await request.text();
        if (text.length > MAX_BODY) {
          return jsonResponse(
            {
              schema: FLOTATION_SCHEMA,
              state: "REJECTED",
              diagnostic: "BODY_TOO_LARGE",
              recoveryPercent: null,
              productionAuthorization: false,
            },
            413,
          );
        }
        let table: string | null = null;
        let bench: string | null = null;
        let scoreColumn: string | null = null;
        let features: Record<string, unknown> | null = null;
        let weights: Record<string, unknown> | null = null;
        let tau = 0.15;
        if (text.trim()) {
          try {
            const body = JSON.parse(text) as {
              table?: unknown;
              bench?: unknown;
              scoreColumn?: unknown;
              features?: unknown;
              weights?: unknown;
              tau?: unknown;
            };
            if (typeof body.table === "string" && body.table.trim() !== "") {
              table = body.table;
            }
            if (body.features && typeof body.features === "object" && !Array.isArray(body.features)) {
              features = body.features as Record<string, unknown>;
            }
            if (body.weights && typeof body.weights === "object" && !Array.isArray(body.weights)) {
              weights = body.weights as Record<string, unknown>;
            }
            if (typeof body.tau === "number" && Number.isFinite(body.tau)) {
              tau = body.tau;
            }
            if (table === null && features === null) {
              return jsonResponse(
                {
                  schema: FLOTATION_SCHEMA,
                  state: "REJECTED",
                  diagnostic: "TABLE_OR_FEATURES_REQUIRED",
                  recoveryPercent: null,
                  productionAuthorization: false,
                },
                400,
              );
            }
            if (typeof body.bench === "string" && body.bench.length > 0) {
              bench = body.bench;
            }
            if (typeof body.scoreColumn === "string" && body.scoreColumn.length > 0) {
              scoreColumn = body.scoreColumn;
            }
          } catch {
            return jsonResponse(
              {
                schema: FLOTATION_SCHEMA,
                state: "REJECTED",
                diagnostic: "INVALID_JSON",
                recoveryPercent: null,
                productionAuthorization: false,
              },
              400,
            );
          }
        } else {
          return jsonResponse(
            {
              schema: FLOTATION_SCHEMA,
              state: "REJECTED",
              diagnostic: "TABLE_OR_FEATURES_REQUIRED",
              recoveryPercent: null,
              productionAuthorization: false,
            },
            400,
          );
        }
        const receipt = buildReceiptFromCsv(table, bench, scoreColumn, features, weights, tau);
        const status = receipt.directive === "BLOCK" ? 422 : 200;
        return jsonResponse(receipt, status);
      },
    },
  },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-szl-kind": "flotation-selectivity",
      "x-szl-production-authorization": "false",
    },
  });
}

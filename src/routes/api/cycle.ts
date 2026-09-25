import { createFileRoute } from "@tanstack/react-router";
import { runSoftwareCycle, CYCLE_SCHEMA, MAX_ROUNDS } from "@/lib/frontier/cycle";
import { observePublicEstate } from "@/lib/frontier/estate-observe";

export const Route = createFileRoute("/api/cycle")({
  server: {
    handlers: {
      GET: async () =>
        jsonResponse({
          schema: CYCLE_SCHEMA,
          method: "POST",
          maxRounds: MAX_ROUNDS,
          productionAuthorization: false,
          trainingAdmission: false,
          energy: "UNAVAILABLE",
          identity: "receipts.in ≡ receipts.out",
          note: "POST { live?: boolean } to run two SOFTWARE rounds. The server is stateless; a 200 cycle is not production authorization.",
        }),
      POST: async ({ request }) => {
        const length = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(length) && length > 4096) {
          return jsonResponse(
            { schema: CYCLE_SCHEMA, state: "REJECTED", diagnostic: "BODY_TOO_LARGE", productionAuthorization: false },
            413,
          );
        }
        let live = false;
        const text = await request.text();
        if (text.length > 4096) {
          return jsonResponse(
            { schema: CYCLE_SCHEMA, state: "REJECTED", diagnostic: "BODY_TOO_LARGE", productionAuthorization: false },
            413,
          );
        }
        if (text.trim()) {
          try {
            const body = JSON.parse(text) as { live?: unknown };
            live = body.live === true;
          } catch {
            return jsonResponse(
              { schema: CYCLE_SCHEMA, state: "REJECTED", diagnostic: "INVALID_JSON", productionAuthorization: false },
              400,
            );
          }
        }

        let counterparty: {
          ok: boolean;
          status: string;
          defaultBranch?: string | null;
          error?: string;
        } | null = null;
        if (live) {
          const estate = await observePublicEstate();
          counterparty = estate.counterparty;
        }
        const report = await runSoftwareCycle({ live, counterparty });
        return jsonResponse(report, 200);
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
      "x-szl-kind": "ouroboros-cycle",
      "x-szl-production-authorization": "false",
    },
  });
}

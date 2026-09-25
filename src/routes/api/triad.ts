import { createFileRoute } from "@tanstack/react-router";
import { composeTriad, spaceTriadContract } from "@/lib/frontier/triad";
import { WORKSTREAMS } from "@/lib/frontier/workstreams";

export const Route = createFileRoute("/api/triad")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const evaluate = url.searchParams.get("evaluate") === "1";
        const body = evaluate
          ? await composeTriad({
              catalogLoaded: WORKSTREAMS.length === 34,
              engineHydratable: true,
            })
          : {
              ...spaceTriadContract(),
              optionalEvaluation: true,
              evaluate: false,
              note: "Contract only. Pass evaluate=1 to compose SOFTWARE envelopes. Envelope authority stays NONE. Production stays HOLD.",
            };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "triad",
            "x-szl-production-authorization": "false",
            "x-szl-authority": "NONE",
            "x-szl-optional-evaluation": evaluate ? "admitted" : "contract",
          },
        });
      },
    },
  },
});

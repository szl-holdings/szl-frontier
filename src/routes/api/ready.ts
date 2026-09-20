import { createFileRoute } from "@tanstack/react-router";
import { readyPayload } from "@/lib/frontier/source";
import { WORKSTREAMS } from "@/lib/frontier/workstreams";

export const Route = createFileRoute("/api/ready")({
  server: {
    handlers: {
      GET: async () => {
        const body = readyPayload({
          catalogLoaded: WORKSTREAMS.length === 34,
          engineHydratable: true,
        });
        return new Response(JSON.stringify(body), {
          status: body.status === "ready" ? 200 : 503,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "readiness",
          },
        });
      },
    },
  },
});

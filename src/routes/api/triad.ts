import { createFileRoute } from "@tanstack/react-router";
import { composeTriad } from "@/lib/frontier/triad";
import { WORKSTREAMS } from "@/lib/frontier/workstreams";

export const Route = createFileRoute("/api/triad")({
  server: {
    handlers: {
      GET: async () => {
        const body = await composeTriad({
          catalogLoaded: WORKSTREAMS.length === 34,
          engineHydratable: true,
        });
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "triad",
            "x-szl-production-authorization": "false",
            "x-szl-authority": "NONE",
          },
        });
      },
    },
  },
});

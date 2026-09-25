import { createFileRoute } from "@tanstack/react-router";
import { programSummary } from "@/lib/frontier/codex-program";

export const Route = createFileRoute("/api/codex")({
  server: {
    handlers: {
      GET: async () => {
        const body = programSummary();
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "codex-upgrade-program",
            "x-szl-production-authorization": "false",
            "x-szl-promotion-effect": "NONE",
          },
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { planEvaluationTurn } from "@/lib/frontier/agent-state";

export const Route = createFileRoute("/api/agent-state")({
  server: {
    handlers: {
      GET: async () => {
        const body = planEvaluationTurn();
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "agent-state",
            "x-szl-production-authorization": "false",
            "x-szl-tools-may-run": "false",
            "x-szl-authority": "NONE",
          },
        });
      },
    },
  },
});

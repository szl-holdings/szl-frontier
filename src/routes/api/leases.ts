import { createFileRoute } from "@tanstack/react-router";
import { evaluationLeaseBook } from "@/lib/frontier/leases";

export const Route = createFileRoute("/api/leases")({
  server: {
    handlers: {
      GET: async () => {
        const body = evaluationLeaseBook();
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "leases",
            "x-szl-production-authorization": "false",
            "x-szl-authority": "NONE",
          },
        });
      },
    },
  },
});

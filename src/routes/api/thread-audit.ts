import { createFileRoute } from "@tanstack/react-router";
import { threadAuditContract } from "@/lib/frontier/thread-audit";

export const Route = createFileRoute("/api/thread-audit")({
  server: {
    handlers: {
      GET: async () => {
        const body = threadAuditContract();
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "thread-audit",
            "x-szl-production-authorization": "false",
            "x-szl-authority": "NONE",
            "x-szl-file-audit-complete": "false",
          },
        });
      },
    },
  },
});

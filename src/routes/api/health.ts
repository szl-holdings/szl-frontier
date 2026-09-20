import { createFileRoute } from "@tanstack/react-router";
import { healthPayload } from "@/lib/frontier/source";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => jsonResponse(healthPayload()),
    },
  },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-szl-kind": "health",
      "x-szl-disposition": "HOLD",
      "x-szl-production-authorization": "false",
    },
  });
}

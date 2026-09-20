import { createFileRoute } from "@tanstack/react-router";
import { sourcePayload } from "@/lib/frontier/source";

export const Route = createFileRoute("/api/source")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(sourcePayload()), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "source-identity",
            "x-szl-production-authorization": "false",
          },
        }),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { observePublicEstate } from "@/lib/frontier/estate-observe";

export const Route = createFileRoute("/api/estate")({
  server: {
    handlers: {
      GET: async () => {
        const body = await observePublicEstate();
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "estate-observation",
            "x-szl-production-authorization": "false",
          },
        });
      },
    },
  },
});

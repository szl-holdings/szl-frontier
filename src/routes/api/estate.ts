import { createFileRoute } from "@tanstack/react-router";
import { observeEstate } from "@/lib/frontier/estate-observe";

export const Route = createFileRoute("/api/estate")({
  server: {
    handlers: {
      GET: async () => {
        const body = await observeEstate();
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "estate-observation",
          },
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { filterWorkstreams, WORKSTREAMS, workstreamSummary } from "@/lib/frontier/workstreams";

export const Route = createFileRoute("/api/workstreams")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") ?? "";
        const family = url.searchParams.get("family") ?? "all";
        const status = url.searchParams.get("status") ?? "all";
        const selected = url.searchParams.get("selected") === "1";
        const items = filterWorkstreams(WORKSTREAMS, {
          q,
          family,
          status,
          selected: selected || undefined,
        });
        return new Response(
          JSON.stringify({
            schema: "szl.frontier.workstreams/v1",
            productionAuthorization: false,
            filters: { q, family, status, selected },
            summary: workstreamSummary(WORKSTREAMS),
            matched: items.length,
            items,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
              "x-szl-kind": "workstreams",
              "x-szl-production-authorization": "false",
            },
          },
        );
      },
    },
  },
});

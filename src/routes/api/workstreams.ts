import { createFileRoute } from "@tanstack/react-router";
import { WORKSTREAMS, workstreamSummary } from "@/lib/frontier/workstreams";

export const Route = createFileRoute("/api/workstreams")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            schema: "szl.frontier.workstreams/v1",
            productionAuthorization: false,
            summary: workstreamSummary(),
            items: WORKSTREAMS,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
              "x-szl-kind": "workstreams",
            },
          },
        ),
    },
  },
});

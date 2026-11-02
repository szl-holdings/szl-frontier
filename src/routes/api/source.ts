import { createFileRoute } from "@tanstack/react-router";
import { fetchDeploymentSourceRevision, sourcePayload } from "@/lib/frontier/source";

export const Route = createFileRoute("/api/source")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(
          JSON.stringify(
            sourcePayload({
              deploymentSourceRevision: await fetchDeploymentSourceRevision(request.url),
            }),
          ),
          {
            status: 200,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
              "x-szl-kind": "source-identity",
              "x-szl-production-authorization": "false",
              "x-szl-file-audit-complete": "false",
              "x-szl-reconciled-head-class": "MODELED",
            },
          },
        ),
    },
  },
});

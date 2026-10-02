import { createFileRoute } from "@tanstack/react-router";
import { classifySha, sourcePayload } from "@/lib/frontier/source";

async function deploymentSourceRevision(request: Request): Promise<string | null> {
  try {
    const url = new URL("/deployment.json", request.url);
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") return null;
    const sha = (body as { source_revision?: unknown }).source_revision;
    return classifySha(typeof sha === "string" ? sha : null) ? sha : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/source")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(JSON.stringify(sourcePayload({ deploymentSourceRevision: await deploymentSourceRevision(request) })), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "source-identity",
            "x-szl-production-authorization": "false",
            "x-szl-file-audit-complete": "false",
            "x-szl-reconciled-head-class": "MODELED",
          },
        }),
    },
  },
});

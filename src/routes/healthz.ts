import { createFileRoute } from "@tanstack/react-router";
import { healthResponse } from "@/lib/frontier/source";

/**
 * Conventional liveness probe for the Hugging Face Space and the Dockerfile
 * HEALTHCHECK. Same payload as `/api/health`. It is not readiness (`/api/ready`)
 * and never production authorization.
 */
export const Route = createFileRoute("/healthz")({
  server: {
    handlers: {
      GET: async () => healthResponse(),
    },
  },
});

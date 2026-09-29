import { createFileRoute } from "@tanstack/react-router";
import { healthResponse } from "@/lib/frontier/source";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => healthResponse(),
    },
  },
});

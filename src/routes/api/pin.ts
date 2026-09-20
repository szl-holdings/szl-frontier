import { createFileRoute } from "@tanstack/react-router";
import { observePublicEstate } from "@/lib/frontier/estate-observe";
import { mintMembershipIdentityPin } from "@/lib/frontier/estate-pin";

export const Route = createFileRoute("/api/pin")({
  server: {
    handlers: {
      GET: async () => {
        const estate = await observePublicEstate();
        const pin = await mintMembershipIdentityPin([
          {
            family: "github",
            status: estate.github.status,
            ids: estate.github.items.map((row) => row.id),
          },
          {
            family: "models",
            status: estate.huggingface.models.status,
            ids: estate.huggingface.models.items.map((row) => row.id),
          },
          {
            family: "datasets",
            status: estate.huggingface.datasets.status,
            ids: estate.huggingface.datasets.items.map((row) => row.id),
          },
          {
            family: "spaces",
            status: estate.huggingface.spaces.status,
            ids: estate.huggingface.spaces.items.map((row) => row.id),
          },
          {
            family: "kernels",
            status: estate.huggingface.kernels.status,
            ids: estate.huggingface.kernels.items.map((row) => row.id),
          },
        ]);
        const body = {
          ...pin,
          observedAt: estate.finishedAt,
          sourceContentFilesRead: estate.sourceContentFilesRead,
          semanticReviewComplete: estate.semanticReviewComplete,
          runtimeVerified: estate.runtimeVerified,
          productionAuthorization: false,
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "membership-identity-pin",
            "x-szl-production-authorization": "false",
            "x-szl-file-audit-complete": "false",
          },
        });
      },
    },
  },
});

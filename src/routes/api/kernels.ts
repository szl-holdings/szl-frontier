import { createFileRoute } from "@tanstack/react-router";
import { kernelFamilyCatalog } from "@/lib/frontier/kernel-family";

export const Route = createFileRoute("/api/kernels")({
  server: {
    handlers: {
      GET: async () => {
        const body = kernelFamilyCatalog();
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-szl-kind": "kernels",
            "x-szl-production-authorization": "false",
            "x-szl-trained": "false",
            "x-szl-authority": "NONE",
          },
        });
      },
    },
  },
});

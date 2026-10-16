import { createServerFn } from "@tanstack/react-start";
import { readVerticalWedges } from "./vertical-wedges";

export const loadVerticalWedges = createServerFn({ method: "GET" }).handler(async () => {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const raw = await readFile(
    join(process.cwd(), "public", "frontier", "competitive-research-register.v1.json"),
    "utf8",
  );
  return readVerticalWedges(raw);
});

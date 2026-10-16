import { createServerFn } from "@tanstack/react-start";
import { join } from "node:path";
import { readVerticalWedges } from "./vertical-wedges";

const REGISTER = join("public", "frontier", "competitive-research-register.v1.json");

export const loadVerticalWedges = createServerFn({ method: "GET" }).handler(async () => {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(join(process.cwd(), REGISTER), "utf8");
  return readVerticalWedges(raw);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { projectRoot } from "./with-app-env.mjs";

test("Docker starts Vite through npm on the Hugging Face port", () => {
  const dockerfile = readFileSync(`${projectRoot()}/Dockerfile`, "utf8");

  assert.match(
    dockerfile,
    /CMD \["npm", "run", "preview", "--", "--host", "0\.0\.0\.0", "--port", "7860", "--strictPort"\]/,
  );
  assert.doesNotMatch(
    dockerfile,
    /CMD \["node", "scripts\/with-app-env\.mjs", "vite"/,
    "the direct wrapper cannot resolve the local Vite binary outside npm",
  );
});

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

test("Docker makes Vite's runtime config directory writable by the node user", () => {
  const dockerfile = readFileSync(`${projectRoot()}/Dockerfile`, "utf8");
  const build = dockerfile.indexOf("RUN npm run typecheck && npm run build");
  const dependencyOwnership = dockerfile.indexOf(
    "RUN chown -R node:node /app/node_modules",
  );
  const runtimeUser = dockerfile.indexOf("USER node");

  assert.notEqual(
    dependencyOwnership,
    -1,
    "the root-installed dependency tree must be handed to the runtime user",
  );
  assert.ok(
    build < dependencyOwnership,
    "node_modules ownership must change after the root-run build is complete",
  );
  assert.ok(
    dependencyOwnership < runtimeUser,
    "node_modules ownership must change before the image switches to USER node",
  );
});

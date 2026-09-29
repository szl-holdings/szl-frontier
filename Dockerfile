# Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
# Digest-pinned multi-arch index for node:26-alpine (resolved 2026-09-29).
# Dependabot's docker ecosystem keeps the tag and digest moving together.
FROM node:26-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run typecheck && npm run build

# Vite compiles its config into node_modules/.vite-temp when preview starts.
# The dependency tree was installed as root, so hand it to the runtime user.
RUN chown -R node:node /app/node_modules

ENV PORT=7860
ENV HOST=0.0.0.0
EXPOSE 7860

USER node
# Liveness only: /healthz is the same payload as /api/health (src/routes/healthz.ts).
# busybox wget ships in the alpine base, so the probe adds no dependency.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:7860/healthz || exit 1
# Run through npm so it supplies node_modules/.bin on PATH. Invoking the
# wrapper directly leaves the Vite binary undiscoverable in provider runtimes.
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "7860", "--strictPort"]

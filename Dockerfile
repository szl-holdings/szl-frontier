# Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run typecheck && npm run build

ENV PORT=7860
ENV HOST=0.0.0.0
EXPOSE 7860

USER node
CMD ["node", "scripts/with-app-env.mjs", "vite", "preview", "--host", "0.0.0.0", "--port", "7860"]

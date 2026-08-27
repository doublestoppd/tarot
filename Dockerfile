# syntax=docker/dockerfile:1
# Production image (spec §39.1): Node 24 LTS slim, standalone Next output,
# non-root runtime user, no build args carrying secrets.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG BUILD_SHA=dev
ENV BUILD_SHA=$BUILD_SHA
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN useradd --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
# Operational scripts + migrations run inside the container (db:migrate etc.).
COPY --from=build --chown=nextjs:nextjs /app/db ./db
COPY --from=build --chown=nextjs:nextjs /app/scripts/container-healthcheck.mjs ./scripts/container-healthcheck.mjs
COPY --from=build --chown=nextjs:nextjs /app/scripts/db-migrate.mjs ./scripts/db-migrate.mjs
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

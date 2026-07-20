# Production image for the NestJS API (pnpm monorepo).
# Build from repo root:
#   docker build -f apps/api/Dockerfile -t closerai-api .
# Run:
#   docker run --env-file apps/api/.env -p 4000:4000 closerai-api

FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY packages/config/package.json packages/config/
COPY packages/database/prisma packages/database/prisma
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm db:generate
RUN pnpm --filter @closerai/shared build
RUN pnpm --filter @closerai/database build
RUN pnpm --filter @closerai/api exec nest build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/.npmrc ./
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/packages/shared/package.json packages/shared/
COPY --from=build /app/packages/database/package.json packages/database/
COPY --from=build /app/packages/config/package.json packages/config/
COPY --from=build /app/packages/database/prisma packages/database/prisma
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/packages/shared/node_modules packages/shared/node_modules
COPY --from=build /app/packages/database/node_modules packages/database/node_modules
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/database/dist packages/database/dist
COPY --from=build /app/apps/api/dist apps/api/dist

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]

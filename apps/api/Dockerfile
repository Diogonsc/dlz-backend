# ── Base ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Development ───────────────────────────────────────────────────────────────
FROM deps AS development
COPY . .
RUN pnpm --filter @dlz/prisma generate
EXPOSE 3333
CMD ["pnpm", "--filter", "api", "dev"]

# ── Builder ───────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN pnpm --filter @dlz/prisma generate
RUN pnpm --filter @dlz/prisma run build
RUN pnpm --filter api build

# ── Production ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
RUN npm install -g pnpm@9
WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/prisma/dist ./packages/prisma/dist
COPY --from=builder /app/packages/prisma/src ./packages/prisma/src
COPY --from=builder /app/packages/prisma/schema.prisma ./packages/prisma/schema.prisma
COPY --from=builder /app/packages/prisma/migrations ./packages/prisma/migrations
COPY --from=builder /app/packages/shared/src ./packages/shared/src

# Prisma client gerado
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/packages/prisma/node_modules ./packages/prisma/node_modules

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3333/health || exit 1

CMD ["node", "apps/api/dist/main"]

FROM node:24-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

FROM base AS deps

WORKDIR /app

ARG DATABASE_URL=mysql://root:root@127.0.0.1:3306/engine
ENV DATABASE_URL=${DATABASE_URL}

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY scripts/seed-if-empty.mjs ./scripts/seed-if-empty.mjs

RUN npm ci --legacy-peer-deps

FROM base AS builder

WORKDIR /app

ARG DATABASE_URL=mysql://root:root@127.0.0.1:3306/engine
ENV DATABASE_URL=${DATABASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ARG DATABASE_URL=mysql://root:root@127.0.0.1:3306/engine
ENV DATABASE_URL=${DATABASE_URL}

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY scripts/seed-if-empty.mjs ./scripts/seed-if-empty.mjs

RUN npm ci --legacy-peer-deps

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node ./scripts/seed-if-empty.mjs && npm run start"]

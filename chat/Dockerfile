FROM oven/bun:1 AS deps

WORKDIR /app

COPY chat/package.json chat/bun.lockb* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS runner

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY chat/ ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "bun run prisma generate && bun run prisma db push && bun run index.ts"]

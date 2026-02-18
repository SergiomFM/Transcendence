FROM oven/bun:1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY chat/package.json chat/bun.lockb* ./
RUN bun install --frozen-lockfile

COPY chat/ ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "bun run prisma generate && bun run prisma db push && bun run index.ts"]

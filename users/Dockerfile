FROM oven/bun:1 AS deps

WORKDIR /app

# sodium-native requires native compilation
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl\
  && rm -rf /var/lib/apt/lists/*
COPY users/package.json ./
RUN bun install

FROM oven/bun:1 AS runner


WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY users/ ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "([ -f /app/database/secret-key ] || openssl rand 32 > /app/database/secret-key) && bun run start"]

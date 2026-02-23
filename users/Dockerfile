FROM node:22.18.0 AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY users/package.json users/package-lock.json ./
RUN npm ci

FROM node:22.18.0 AS runner

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY users/ ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && ([ -f /app/database/secret-key ] || openssl rand 32 > /app/database/secret-key) && npm start"]

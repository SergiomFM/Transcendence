FROM oven/bun:1

WORKDIR /app

COPY game/package.json game/bun.lock* ./
RUN bun install --frozen-lockfile

COPY game/ ./
COPY shared/ ./shared/
COPY frontend/public/models/ ./public/models/

ENV NODE_ENV=production

EXPOSE 3000

CMD ["fastify", "start", "-l", "warn", "-a", "0.0.0.0", "app.js"]

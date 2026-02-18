FROM node:22.18.0

WORKDIR /app

COPY users/package.json users/package-lock.json ./
RUN npm ci

COPY users/ ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && npx prisma db push --url 'file:./data/dev.db' && openssl rand 32 > secret-key && npm start"]

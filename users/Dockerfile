FROM node:22.18.0

WORKDIR /app

COPY . ./

RUN npm install

# RUN mkdir -p -m 755 data

# RUN mkdir -p data

# Generate Prisma Client
RUN npx prisma generate

# Run database migrations (will create SQLite DB if it doesn't exist)
RUN npx prisma db push --url "file:./data/dev.db"


EXPOSE 3000

CMD ["npm", "run", "start"]
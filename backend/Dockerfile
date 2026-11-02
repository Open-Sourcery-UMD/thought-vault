FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json ./

# Prisma needs these files during npm ci/postinstall
COPY prisma ./prisma
COPY prisma7.config.ts ./

RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
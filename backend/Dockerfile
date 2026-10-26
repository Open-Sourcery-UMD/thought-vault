FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
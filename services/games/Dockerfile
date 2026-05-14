FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .

EXPOSE 4001

CMD ["sh", "-c", "bun run prisma:migrate:deploy && bun run prisma:generate && bun run src/main.ts"]

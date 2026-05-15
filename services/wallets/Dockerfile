FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY frontend/package.json frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/games/package.json services/games/package.json
COPY services/wallets/package.json services/wallets/package.json
RUN bun install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY services/wallets services/wallets

WORKDIR /app/services/wallets

EXPOSE 4002

CMD ["sh", "-c", "bun run prisma:migrate:deploy && bun run prisma:generate && bun run src/main.ts"]

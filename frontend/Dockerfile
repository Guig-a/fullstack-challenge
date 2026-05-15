FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY frontend/package.json frontend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/games/package.json services/games/package.json
COPY services/wallets/package.json services/wallets/package.json
RUN bun install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY frontend frontend

WORKDIR /app/frontend

ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_GAMES_SOCKET_PATH=/games/socket.io
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=crash
ARG VITE_KEYCLOAK_CLIENT_ID=crash-game-client

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GAMES_SOCKET_PATH=$VITE_GAMES_SOCKET_PATH \
    VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "preview"]

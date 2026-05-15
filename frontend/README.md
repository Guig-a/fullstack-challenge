# Frontend

Aplicação web do desafio Crash Game, construída com Vite, React, TypeScript e
Tailwind CSS.

## Comandos

Instalar dependências na raiz do monorepo:

```bash
bun install
```

Rodar em modo desenvolvimento:

```bash
bun run --cwd frontend dev
```

Validar build:

```bash
bun run --cwd frontend build
```

Testes:

```bash
bun run --cwd frontend test
```

### Docker

Imagem de produção local (Compose): build na raiz do monorepo com `frontend/Dockerfile`,
servindo `dist/` em `http://localhost:3000` via `vite preview`.

```bash
docker compose build frontend
docker compose up -d frontend
```

Variáveis `VITE_*` são injetadas no **build** da imagem (`ARG` no Dockerfile / `build.args`
no Compose). Para outro host de API em produção, reconstrua a imagem com os valores corretos.

## Ambiente

Copie `.env.example` para `.env.local` quando precisar sobrescrever os valores
locais de Kong/Keycloak.

Variáveis usadas pelo app:

- `VITE_API_BASE_URL`: URL pública do Kong, por padrão `http://localhost:8000`.
- `VITE_GAMES_SOCKET_PATH`: path Socket.IO exposto pelo Kong, por padrão `/games/socket.io`.
- `VITE_KEYCLOAK_URL`: URL base do Keycloak, por padrão `http://localhost:8080`.
- `VITE_KEYCLOAK_REALM`: realm usado pelo desafio, por padrão `crash-game`.
- `VITE_KEYCLOAK_CLIENT_ID`: client público do frontend, por padrão `crash-game-client`.
- `VITE_ROUND_BETTING_WINDOW_MS`: janela de apostas em ms para o **timer** (alinhar ao `ROUND_BETTING_WINDOW_MS` do Game), padrão `10000`.

Com a stack local em execução, acesse `/login` e entre com o usuário de teste do
realm para liberar a rota `/game`.

## Integração

A tela `/game` usa TanStack Query para carregar:

- `GET /games/rounds/current`
- `GET /games/rounds/history?limit=20&offset=0`
- `GET /games/rounds/:roundId/verify` (rodada finalizada)
- `GET /wallets/me`
- `GET /games/bets/me`

Comandos de jogo:

- `POST /games/bet` — corpo `{ "amountCents": "100" }` (string inteira)
- `POST /games/bet/cashout` — sem corpo; usa a aposta ativa do jogador na rodada em execução

As chamadas autenticadas reutilizam o token do `AuthProvider`, que atualiza o
JWT antes de enviar o bearer token ao Kong.

### WebSocket (Socket.IO)

O app conecta em `VITE_API_BASE_URL` com `path` configurável (`VITE_GAMES_SOCKET_PATH`,
padrão `/games/socket.io` via Kong). Os eventos do servidor disparam invalidação
das queries acima para manter estado consistente com o push do Game Service.

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

## Ambiente

Copie `.env.example` para `.env.local` quando precisar sobrescrever os valores
locais de Kong/Keycloak.

Variáveis usadas pelo app:

- `VITE_API_BASE_URL`: URL pública do Kong, por padrão `http://localhost:8000`.
- `VITE_KEYCLOAK_URL`: URL base do Keycloak, por padrão `http://localhost:8080`.
- `VITE_KEYCLOAK_REALM`: realm usado pelo desafio, por padrão `crash`.
- `VITE_KEYCLOAK_CLIENT_ID`: client público do frontend, por padrão `crash-game-client`.

Com a stack local em execução, acesse `/login` e entre com o usuário de teste do
realm para liberar a rota `/game`.

## Integração

A tela `/game` usa TanStack Query para carregar:

- `GET /games/rounds/current`
- `GET /wallets/me`
- `GET /games/bets/me`

Comandos de jogo:

- `POST /games/bet` — corpo `{ "amountCents": "100" }` (string inteira)
- `POST /games/bet/cashout` — sem corpo; usa a aposta ativa do jogador na rodada em execução

As chamadas autenticadas reutilizam o token do `AuthProvider`, que atualiza o
JWT antes de enviar o bearer token ao Kong.

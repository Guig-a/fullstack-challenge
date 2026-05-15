# Desafio Full-stack - Crash Game 🎮

## Bem-vindo à Jungle Gaming 🦧

A **Jungle Gaming** é uma software house especializada em iGaming — desenvolvemos plataformas de cassino online com tecnologia de ponta: NestJS, Bun, TanStack, DDD e arquitetura orientada a eventos. Somos apaixonados por engenharia de software e acreditamos que grandes produtos nascem de grandes times.

Este desafio é a porta de entrada para fazer parte desse time. Ele foi desenhado para refletir problemas reais do nosso dia a dia: sistemas distribuídos, tempo real, precisão monetária, experiência de usuário e arquitetura bem pensada.

Não esperamos perfeição — esperamos raciocínio claro, código limpo e decisões justificadas. Mostre como você pensa e como você constrói.

---

## Implementação do Candidato

Esta seção registra as decisões tomadas durante a implementação. A ideia é manter um histórico curto por etapa, sempre conectado aos critérios de avaliação: DDD/arquitetura, qualidade de código, testes, precisão monetária e execução via Docker.

### Progresso por Commit

#### `chore: initialize monorepo workspaces (frontend, packages/contracts)`

- Inicializado o workspace `frontend` para corrigir o monorepo Bun e permitir `bun install` na raiz.
- Criado o pacote compartilhado `@crash/contracts`, que será usado para centralizar contratos de eventos entre serviços e reduzir divergência entre Game e Wallet.
- Gerado `bun.lock` para garantir instalação reproduzível.

#### `fix: stabilize docker compose startup and healthchecks`

- Ajustado o volume do PostgreSQL 18 para o layout recomendado pela imagem oficial.
- Normalizado o script de inicialização do Postgres para LF e adicionado `.gitattributes` para evitar regressão em ambientes Windows.
- Corrigidos healthchecks de Postgres, Keycloak, Game e Wallet para que `bun run docker:up` deixe todos os serviços saudáveis sem passo manual.

#### `feat(wallets): implement wallet domain and authenticated API`

- Implementado o bounded context Wallet com separação em camadas:
  - `domain`: `Money`, `Wallet` e erros de domínio.
  - `application`: casos de uso e porta de repositório.
  - `infrastructure`: Prisma, PostgreSQL e validação JWT via Keycloak/JWKS.
  - `presentation`: controllers HTTP e DTOs.
- Valores monetários são manipulados em centavos inteiros (`bigint` no domínio TypeScript e `BIGINT` no PostgreSQL). A API serializa `balanceCents` como string para evitar perda de precisão em JSON.
- Adicionadas migrations Prisma aplicadas automaticamente no startup do container do Wallet.
- Implementadas rotas autenticadas:
  - `POST /wallets`
  - `GET /wallets/me`
- Mantido `GET /wallets/health` sem autenticação para healthcheck.
- Adicionados testes unitários de domínio para criação de carteira, crédito, débito, saldo insuficiente e precisão monetária.
- Criados contratos iniciais em `@crash/contracts` para eventos futuros de débito/crédito via mensageria.

#### `feat(games): model round and bet domain`

- Modelado o domínio do Game Service com `Round` como agregado principal e `Bet` como entidade de aposta.
- Implementadas transições `betting -> running -> crashed` e invariantes de aposta única por jogador, cashout apenas durante rodada ativa e liquidação de apostas pendentes no crash.
- Valores monetários e multiplicadores foram representados com inteiros (`bigint`) para evitar ponto flutuante em regras financeiras.
- O `Round` recebe um `CrashPoint` explícito, permitindo cenários determinísticos nos testes e preparando a base para futuros E2E com seed controlada.
- Adicionados testes unitários cobrindo ciclo de vida da rodada, validações de aposta, cashout, cálculo de payout e transições inválidas.

#### `feat(games): add provably fair crash generation`

- Implementada a base provably fair do Game Service com commit prévio da seed via `SHA-256` e cálculo do resultado por `HMAC-SHA256(serverSeed, clientSeed:nonce)`.
- O crash point é derivado dos primeiros 52 bits do HMAC e convertido para basis points com `bigint`, mantendo o resultado verificável e sem ponto flutuante nas regras financeiras.
- Adicionadas verificações para revelar a seed ao final da rodada e permitir que o jogador compare `serverSeedHash` e `CrashPoint` calculado.
- Cobertos testes unitários determinísticos para hash da seed, HMAC esperado, crash point esperado, verificação positiva/negativa, seed inválida e nonce inválido.

#### `feat(games): persist rounds and bets`

- Adicionada persistência do Game Service com Prisma e PostgreSQL para `rounds` e `bets`, mantendo `Round` como agregado de domínio e o banco como detalhe de infraestrutura.
- Criada migration com unicidade por `roundId + userId`, reforçando também no banco a regra de uma aposta por jogador em cada rodada.
- Implementada porta `RoundRepository` e repositório Prisma para salvar e reidratar snapshots de rodadas e apostas sem acoplar o domínio ao ORM.
- Migrations e geração do Prisma Client foram integradas ao startup do container do Game, seguindo o padrão já usado no Wallet Service.
- Adicionado teste unitário de reidratação de snapshots persistidos para proteger o contrato entre domínio e repositório.

#### `feat(games): persist provably fair round proof`

- Estendida a modelagem de `Round` para carregar os dados de prova provably fair da rodada.
- Persistidos `serverSeedHash`, `clientSeed`, `nonce`, `hmac` e seed revelável para permitir verificação futura do crash point.
- Atualizado o repositório Prisma para salvar e reidratar a prova junto com o agregado, mantendo o domínio desacoplado do ORM.
- Adicionados testes unitários cobrindo snapshot e reidratação da prova.

#### `feat(games): expose round query endpoints`

- Implementados casos de uso de leitura para rodada atual, histórico paginado e verificação provably fair de rodadas finalizadas.
- Expostas as rotas públicas `GET /games/rounds/current`, `GET /games/rounds/history` e `GET /games/rounds/:roundId/verify`.
- DTOs serializam valores `bigint` como string e ocultam `serverSeed` enquanto a rodada ainda não crashou.
- O endpoint de verificação retorna conflito para rodadas ainda não finalizadas, preservando a regra de revelar a seed apenas após o crash.
- Adicionados testes unitários para handlers de leitura, paginação, verificação e serialização segura dos DTOs.

#### `feat(games): add authenticated bet command endpoints`

- Adicionada validação JWT no Game Service seguindo o mesmo padrão do Wallet Service com Keycloak/JWKS.
- Implementados casos de uso autenticados para `POST /games/bet` e `POST /games/bet/cashout`, persistindo as mudanças no agregado `Round`.
- `POST /games/bet/cashout` usa um provedor server-side de multiplicador baseado no tempo de rodada, sem aceitar multiplicador informado pelo cliente.
- Valores de aposta continuam entrando como centavos inteiros (`amountCents` string) e são validados pelo value object `BetAmount`.
- A liquidação financeira por RabbitMQ ainda fica isolada para a próxima etapa: este commit registra a aposta/cashout no Game, mas não debita/credita Wallet.
- Adicionados testes unitários para comandos de aposta, cashout e cálculo server-side do multiplicador atual.

#### `feat(services): integrate wallet events over rabbitmq`

- Centralizados em `@crash/contracts` os nomes de exchange, routing keys e filas dos eventos de Wallet.
- Game publica `wallet.debit.requested` ao registrar aposta e `wallet.credit.requested` ao registrar cashout.
- Wallet consome pedidos via RabbitMQ, aplica débito/crédito usando o domínio `Wallet` e publica `wallet.debited`, `wallet.credited` ou `wallet.operation.rejected`.
- Game consome os eventos de resultado da Wallet para fechar a comunicação bidirecional entre serviços; a saga compensatória completa para rejeições fica como próxima evolução.
- Adicionados testes unitários para os handlers de débito/crédito da Wallet e para a publicação de pedidos de Wallet pelos comandos do Game.

#### `feat(games): compensate rejected wallet debits`

- Estendido `wallet.operation.rejected` com a operação original (`DEBIT` ou `CREDIT`) para permitir compensações específicas no Game.
- Adicionado o estado `rejected` em `Bet` para representar apostas recusadas pela Wallet, como saldo insuficiente ou carteira inexistente.
- Game compensa rejeições de débito marcando a aposta como rejeitada e persistindo o agregado `Round`, liberando o jogador para tentar nova aposta durante a fase de apostas.
- Rejeições de crédito são consumidas e preservadas para tratamento operacional futuro, sem reverter cashout já registrado no Game.
- Adicionados testes unitários para compensação de débito rejeitado, nova aposta após rejeição e preservação do fluxo de crédito rejeitado.

#### `feat(games): run automated round cycle`

- Adicionado motor automático no Game Service para garantir uma rodada corrente ao subir o serviço.
- O ciclo transiciona a rodada de `betting` para `running`, agenda o crash com base no `CrashPoint` e cria a próxima rodada de apostas ao finalizar.
- Novas rodadas são criadas por uma factory que gera seed/proof provably fair e mantém o `CrashPoint` verificável.
- A janela de apostas é configurável via `ROUND_BETTING_WINDOW_MS`, com padrão de 10 segundos.
- Adicionados testes unitários para criação de rodada, transição para running, crash, criação da próxima rodada e cálculo do delay até crash.

#### `feat(games): broadcast realtime round events`

- Adicionado gateway WebSocket no Game Service usando `@nestjs/websockets` com Socket.IO no path `/games/socket.io`.
- Criada a porta de aplicação `RoundRealtimePublisher`, mantendo o motor e os casos de uso desacoplados do transporte WebSocket.
- O servidor publica eventos `round.created`, `round.started`, `round.crashed`, `bet.placed`, `bet.cashed_out` e `bet.rejected`.
- Payloads reutilizam DTOs de apresentação para serializar centavos, multiplicadores e nonces como string, preservando precisão em JSON.
- Adicionados testes unitários para emissões do motor, comandos de aposta/cashout, compensação de débito rejeitado e payloads do gateway.

#### `feat(games): confirm wallet debits before settling bets`

- A aposta passa a nascer como `pending_debit`, evitando que o jogador faça cashout antes de a Wallet confirmar o débito.
- Game consome `wallet.debited` e confirma a aposta para `placed`, emitindo `bet.confirmed` via WebSocket.
- Cashout e marcação de perda no crash só são permitidos para apostas com débito confirmado.
- Apostas ainda pendentes no momento do crash são rejeitadas no agregado; se um débito tardio chegar para uma aposta rejeitada, o Game solicita crédito de refund para a Wallet.
- Adicionados testes unitários para confirmação de débito, bloqueio de cashout pendente, idempotência de débito confirmado e refund de débito tardio.

#### `feat(games): expose player bet history`

- Implementado `GET /games/bets/me` autenticado para retornar o histórico paginado de apostas do jogador logado.
- Adicionada consulta `findBetsByUserId` na porta `RoundRepository` e no repositório Prisma, ordenando apostas mais recentes primeiro.
- Criado `GetPlayerBetHistoryHandler` para manter a regra de leitura fora do controller.
- A resposta usa `PlayerBetHistoryResponseDto` com `BetResponseDto`, preservando centavos, multiplicadores e payouts como string.
- Adicionados testes unitários para o handler e serialização do histórico paginado.

#### `fix(gateway): route game websocket through kong`

- Ajustado o path interno do Socket.IO no Game Service para `/socket.io`.
- Como o Kong usa `strip_path: true` na rota `/games`, o frontend deve conectar via gateway usando `/games/socket.io`; o Kong encaminha para `/socket.io` no serviço.
- Mantida a separação entre API pública via Kong e detalhe interno do serviço para não quebrar as rotas REST existentes.

#### `feat(wallets): seed test player wallet`

- Fixado o `id` do usuário `player` no realm do Keycloak para que o `sub` do JWT seja previsível entre ambientes.
- Adicionado bootstrap idempotente no Wallet Service para criar a carteira do usuário de teste quando ela ainda não existir.
- O saldo inicial vem de `TEST_PLAYER_INITIAL_BALANCE_CENTS`, configurado em `100000` centavos no `.env.example` do Wallet.
- O seed é executado no startup do Wallet e não altera carteiras já existentes, evitando sobrescrever saldos durante uso local.
- Adicionados testes unitários para criação do seed, idempotência, ausência de configuração e validação do saldo inicial.

#### `test(e2e): add backend smoke flow`

- Adicionado E2E em `services/games/tests/e2e` para rodar contra a stack real via Kong e Keycloak.
- O teste obtém token do usuário `player`, consulta a Wallet sem criar dados manuais, espera uma rodada em `betting`, faz uma aposta e valida o histórico autenticado.
- A confirmação assíncrona da aposta é validada aguardando o status `placed`, cobrindo o caminho Game -> RabbitMQ -> Wallet -> RabbitMQ -> Game.
- URLs e credenciais podem ser sobrescritas via `E2E_GATEWAY_URL`, `E2E_KEYCLOAK_TOKEN_URL`, `E2E_PLAYER_USERNAME` e `E2E_PLAYER_PASSWORD`.
- O teste exige `bun run docker:up` rodando e serviços saudáveis.

### Validação Atual

```bash
bun run docker:up
docker compose ps
cd services/wallets && bun test tests/unit
cd services/games && bun test tests/unit
cd services/games && bun run tsc --noEmit
cd services/games && bun test tests/e2e
```

Também foi validado manualmente o fluxo autenticado via Kong com token real do usuário `player` do Keycloak:

- `POST http://localhost:8000/wallets`
- `GET http://localhost:8000/wallets/me`


---

## Visão Geral 📖

Um **Crash Game** é um jogo de cassino multiplayer em tempo real: um multiplicador sobe a partir de `1.00x` e pode "crashar" a qualquer momento. Jogadores apostam antes da rodada e precisam sacar (cash out) antes do crash para garantir os ganhos — caso contrário, perdem a aposta.

Você deve construir o **backend** (engine do jogo, carteira, comunicação em tempo real) e o **frontend** (UI com animações, interface de apostas, histórico).

**Autenticação não faz parte do escopo.** O projeto já vem com Keycloak configurado — fique à vontade para substituí-lo por Auth0 ou Okta se preferir.

---

## Regras do Jogo 🎲

1. **Fase de Apostas** — Janela configurável (ex: 10s) para apostar. Cada jogador pode fazer apenas **uma aposta por rodada**.
2. **Início da Rodada** — O multiplicador começa em `1.00x` e sobe continuamente.
3. **Cash Out** — O jogador pode sacar a qualquer momento durante a rodada. Pagamento = `aposta × multiplicador atual`. Após sacar, não pode reentrar.
4. **Crash** — O multiplicador para em um ponto pré-determinado. Quem não sacou perde a aposta.
5. **Fim da Rodada** — Resultados revelados, saldos atualizados, nova fase de apostas começa.

**Restrições:**

- Aposta mínima: `1.00` / Máxima: `1.000,00`
- Saldo insuficiente → aposta rejeitada
- Sem aposta na rodada → não pode sacar
- Rodada ativa → não pode apostar (apenas na fase de apostas)

---

## Arquitetura 🏗️

```
                        ┌──────────────────────────┐
                        │        Frontend           │
                        │   (React + Tailwind CSS)  │
                        └─────┬────────────┬────────┘
                           HTTP/REST    WebSocket
                              │            │
                        ┌─────▼────────────▼────────┐
                        │         Kong               │
                        │      (API Gateway)         │
                        └─────┬────────────┬────────┘
                              │            │
                    ┌─────────▼──┐   ┌─────▼────────┐
                    │   Game     │   │   Wallet     │
                    │  Service   │   │   Service    │
                    │  (NestJS)  │   │   (NestJS)   │
                    └──┬─────┬──┘   └──────┬───────┘
                       │     └──────┬──────┘
                  ┌────▼────┐  ┌────▼──────────┐
                  │PostgreSQL│  │ RabbitMQ/SQS  │
                  └─────────┘  └───────────────┘

              ┌─────────────────┐
              │    Keycloak     │
              │  (IdP — OIDC)   │
              └─────────────────┘
```

---

## Tech Stack Aceita 🛠️

| Camada          | Tecnologia                                                        |
| --------------- | ----------------------------------------------------------------- |
| **Runtime**     | Bun (latest)                                                      |
| **Backend**     | NestJS + TypeScript (strict mode)                                 |
| **Banco**       | PostgreSQL 18+ com ORM (MikroORM, Prisma ou TypeORM)              |
| **Mensageria**  | RabbitMQ, Kafka Ou AWS SQS (Via LocalStack)                       |
| **API Gateway** | Kong ou AWS API Gateway                                           |
| **IdP**         | Keycloak (preferido), Auth0 ou Okta                               |
| **WebSocket**   | `@nestjs/websockets` + `socket.io` ou `ws`                        |
| **Frontend**    | Next.js, Vite ou Tanstack Start                                   |
| **Estilo**      | Tailwind CSS v4 + shadcn/ui                                       |
| **Estado**      | TanStack Query (server state) + Zustand ou Context (client state) |
| **Testes**      | Bun test runner ou Vitest                                         |
| **Docs**        | Swagger / OpenAPI (`@nestjs/swagger`)                             |
| **Infra**       | Docker Compose                                                    |

---

## Modelo de Domínio 🧩

O sistema é dividido em dois bounded contexts:

### Game Service

Responsável pelo ciclo de vida da rodada, apostas, lógica de crash, provably fair e WebSocket.

- **Round** — Agregado principal. Gerencia o ciclo de vida completo de uma rodada.
- **Bet** — Aposta de um jogador em uma rodada.
- **Crash Point** — Multiplicador pré-determinado onde a rodada termina (gerado via algoritmo provably fair).

Cabe a você modelar os estados, transições, invariantes e regras de negócio de cada entidade.

### Wallet Service

Responsável pela carteira do jogador: saldo, operações de crédito e débito.

- **Wallet** — Uma por jogador. **Nunca use ponto flutuante para dinheiro** — use centavos inteiros (`BIGINT`), `NUMERIC` ou biblioteca Decimal.

### Comunicação entre serviços

Game e Wallet se comunicam **assincronamente via RabbitMQ/SQS**. Você deve projetar os eventos, fluxos e estratégias de compensação necessários para garantir consistência entre os serviços.

O design dessa comunicação é **parte central da avaliação**.

---

## Algoritmo Provably Fair 🔐

O crash point de cada rodada deve ser **verificável pelo jogador** — garantindo que o resultado foi pré-determinado e não manipulado após as apostas.

Pesquise como algoritmos provably fair funcionam em crash games. Conceitos relevantes: hash chains, HMAC, seeds, house edge. O jogador deve ser capaz de verificar independentemente o crash point de qualquer rodada passada.

A implementação desse algoritmo (geração, cálculo e verificação) faz parte da avaliação.

---

## Referência da API 📡

Todos os endpoints são acessados via **Kong** (`http://localhost:8000`).

### REST

#### Wallet Service — `/wallets`

| Método | Endpoint      | Auth | Descrição                                |
| ------ | ------------- | ---- | ---------------------------------------- |
| `POST` | `/wallets`    | Sim  | Cria carteira para o jogador autenticado |
| `GET`  | `/wallets/me` | Sim  | Retorna carteira e saldo do jogador      |

> Crédito e débito **não** são expostos via REST — acontecem via message broker.

#### Game Service — `/games`

| Método | Endpoint                        | Auth | Descrição                                  |
| ------ | ------------------------------- | ---- | ------------------------------------------ |
| `GET`  | `/games/rounds/current`         | Não  | Estado da rodada atual com apostas         |
| `GET`  | `/games/rounds/history`         | Não  | Histórico paginado de rodadas              |
| `GET`  | `/games/rounds/:roundId/verify` | Não  | Dados de verificação provably fair         |
| `GET`  | `/games/bets/me`                | Sim  | Histórico de apostas do jogador (paginado) |
| `POST` | `/games/bet`                    | Sim  | Fazer aposta na rodada atual               |
| `POST` | `/games/bet/cashout`            | Sim  | Sacar no multiplicador atual               |

### WebSocket

A conexão WebSocket é usada exclusivamente para **comunicação do servidor para o cliente** (push de eventos em tempo real). Todas as ações do jogador (apostar, sacar) são feitas via REST.

Via Kong, o gateway Socket.IO fica exposto em `/games/socket.io`. Internamente, o Game Service escuta em `/socket.io`, pois o Kong remove o prefixo `/games` antes de encaminhar a requisição. O servidor emite os seguintes eventos:

- `round.created`: nova rodada de apostas disponível.
- `round.started`: rodada entrou em execução e o multiplicador pode ser animado pelo frontend.
- `round.crashed`: rodada finalizada; inclui dados públicos da rodada e prova revelável.
- `bet.placed`: aposta registrada no Game como pendente e débito solicitado para a Wallet.
- `bet.confirmed`: débito confirmado pela Wallet e aposta liberada para cashout/crash.
- `bet.cashed_out`: cashout registrado no Game e crédito solicitado para a Wallet.
- `bet.rejected`: aposta compensada após rejeição de débito pela Wallet.

Os payloads seguem os DTOs HTTP (`RoundResponseDto` e `BetResponseDto`), com `bigint` serializado como string para evitar perda de precisão.

Esses eventos mantêm todos os clientes sincronizados em tempo real e fornecem ao frontend as informações necessárias para:

- Saber quando uma nova rodada começa e quando a fase de apostas termina
- Acompanhar o multiplicador durante a rodada
- Saber quando a rodada crashou (e os dados de verificação)
- Ver as apostas e cash outs dos outros jogadores em tempo real

O design dos eventos WebSocket, seus payloads e a estratégia de sincronização do multiplicador fazem parte da avaliação.

---

## Requisitos do Frontend 🖥️

### Página de Login

Redirect para Keycloak (OIDC authorization code flow). Tratar callback e armazenar tokens.

### Página do Jogo (Principal)

**Gráfico do Crash** — Multiplicador animado subindo de `1.00x`, curva visual, indicação clara do crash, exibição do hash da seed antes da rodada.

**Controles de Aposta** — Input de valor com validação, botão "Apostar" (habilitado só na fase de apostas), botão "Cash Out" (habilitado só durante rodada ativa com aposta pendente, exibindo pagamento potencial), timer de contagem regressiva.

**Apostas da Rodada Atual** — Lista em tempo real de todas as apostas, mostrando username, valor e status. Destacar cash outs.

**Histórico de Rodadas** — Últimos ~20 crash points, com código de cores (vermelho = crash baixo, verde = crash alto).

**Info do Jogador** — Saldo atual em destaque, username (do JWT).

### UI/UX

- **Dark mode** — Estética de cassino (fundo escuro, acentos vibrantes/neon)
- **Responsivo** — Desktop e mobile
- **Animações** — Curva suave, feedback de cashout, animação de crash
- **Loading states** — Skeletons ou spinners
- **Erros** — Toast notifications (saldo insuficiente, erro de rede, etc.)

---

## Infraestrutura e Setup 🐳

### Pré-requisitos

- Bun >= 1.x
- Docker & Docker Compose

### Stack pré-configurada

O repositório já inclui `docker-compose.yml` e arquivos de suporte prontos para uso:

| Serviço        | Imagem                             | Portas                                  |
| -------------- | ---------------------------------- | --------------------------------------- |
| PostgreSQL     | `postgres:18.3-alpine`             | `5432` (databases: `games` e `wallets`) |
| RabbitMQ       | `rabbitmq:4.2.4-management-alpine` | `5672` (AMQP), `15672` (UI)             |
| Keycloak       | `quay.io/keycloak/keycloak:26.5.5` | `8080`                                  |
| Kong           | `kong:3.9.1`                       | `8000` (proxy), `8001` (admin)          |
| Frontend       | —                                  | `http://localhost:3000`                 |
| Game Service   | —                                  | `http://localhost:4001`                 |
| Wallet Service | —                                  | `http://localhost:4002`                 |

**Você pode modificar qualquer parte da infra.** Prefere SQS ao invés de RabbitMQ? Outro API Gateway? Outro IdP? Fique à vontade. O único requisito é que **`bun run docker:up` suba tudo sem nenhum passo manual** — incluindo realm do Keycloak, config do Kong e migrations de banco.

### Keycloak

O realm `crash-game` é importado automaticamente no `docker:up`. Nenhuma configuração manual necessária.

| Item           | Valor                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| Admin UI       | `http://localhost:8080` (`admin` / `admin`)                                |
| Realm          | `crash-game`                                                               |
| Client ID      | `crash-game-client` (public, PKCE S256)                                    |
| Usuário teste  | `player` / `player123`                                                     |
| User ID teste  | `00000000-0000-0000-0000-000000000001`                                     |
| Saldo inicial  | `100000` centavos (`1,000.00`)                                             |
| OIDC discovery | `http://localhost:8080/realms/crash-game/.well-known/openid-configuration` |

### Scaffold dos serviços de aplicação

**Backend — pronto.** Ambos os serviços já possuem scaffold NestJS funcional com estrutura DDD e rota `GET /health`. Estão integrados ao `docker-compose.yml` e roteados pelo Kong.

| Serviço        | Porta direta | Via Kong                          |
| -------------- | ------------ | --------------------------------- |
| Game Service   | `4001`       | `http://localhost:8000/games/*`   |
| Wallet Service | `4002`       | `http://localhost:8000/wallets/*` |

Cada serviço tem:

- Estrutura de camadas DDD: `domain/`, `application/`, `infrastructure/`, `presentation/`
- `tests/unit/` e `tests/e2e/` prontos para receber os testes
- `packages/` na raiz do monorepo para pacotes compartilhados entre serviços (ex: `@crash/eslint`)

**Frontend — a implementar.** A pasta `frontend/` existe mas o scaffold é responsabilidade do candidato. Use o framework de sua preferência:

- **Vite + React** — opção mais leve, ideal se quiser controle total
- **Next.js** — SSR out-of-the-box, boa escolha para SEO e rotas
- **TanStack Start** — preferido na stack da Jungle Gaming

O placeholder no `docker-compose.yml` está comentado — descomente e adapte com seu `Dockerfile` e porta após criar o scaffold.

### Variáveis de ambiente

As credenciais de infraestrutura (PostgreSQL, RabbitMQ, Keycloak) estão hardcoded no `docker-compose.yml` — são valores de desenvolvimento local, sem necessidade de `.env` no root.

Cada serviço possui `.env.example` com as variáveis necessárias. Copie para `.env` antes de rodar fora do Docker:

```bash
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
```

**Você pode modificar qualquer parte da infra.** Prefere SQS ao invés de RabbitMQ? Outro API Gateway? Outro IdP? Fique à vontade. O único requisito é que **`bun run docker:up` suba tudo**.

### Comandos

```bash
git clone https://github.com/junglegaming/fullstack-challenge
cd fullstack-challenge
bun install
bun run docker:up      # Sobe tudo (infra + serviços + frontend)
bun run docker:down    # Para os containers
bun run docker:prune   # Remove tudo (containers, volumes, imagens)
```

---

## Estrutura do Projeto 📁

> Estrutura sugerida — pode adaptar, desde que mantenha a separação de camadas DDD (domain → application → infrastructure → presentation).

```
fullstack-challenge/
├── services/
│   ├── games/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   ├── tests/ (unit/ + e2e/)
│   │   ├── Dockerfile
│   │   ├── .env
│   │   └── package.json
│   └── wallets/
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── domain/
│       │   ├── application/
│       │   ├── infrastructure/
│       │   └── presentation/
│       ├── tests/ (unit/ + e2e/)
│       ├── Dockerfile
│       ├── .env
│       └── package.json
├── packages/                          # Pacotes compartilhados entre serviços
│   │                                  # Ex: @crash/eslint
│   └── (pacotes serão adicionados aqui)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── stores/
│   ├── Dockerfile
│   ├── .env
│   └── package.json
├── docker/
│   ├── kong/kong.yml
│   ├── keycloak/realm-export.json
│   └── postgres/init-databases.sh
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Testes 🧪

### Obrigatórios

**Unitários (camada de domínio):**

- Ciclo de vida do Round (transições de estado, violação de invariantes)
- Lógica de Bet (cálculo de cashout, transições de status, validação de valor)
- Wallet (crédito, débito, saldo insuficiente, precisão monetária)
- Provably fair (cálculo determinístico do crash point, verificação da hash chain)

**E2E (camada de API):**

- Apostar → multiplicador sobe → cashout → saldo atualizado
- Apostar → crash → aposta perdida
- Erros de validação (saldo insuficiente, aposta dupla, aposta durante rodada ativa)

### Comandos

```bash
cd services/games && bun test tests/unit
cd services/wallets && bun test tests/unit
cd services/games && bun test tests/e2e     # requer docker:up
cd frontend && bun test
```

---

---

## Critérios de Avaliação 📊

### Eliminatórios (todos devem passar)

- `bun run docker:up` sobe tudo sem passos manuais
- Gameplay funciona (apostar → multiplicador → cashout/crash → liquidação)
- Dois serviços separados comunicando via RabbitMQ/SQS
- Sincronização em tempo real (múltiplas abas mostram o mesmo estado)
- Precisão monetária (sem ponto flutuante para dinheiro, saldo nunca negativo)
- Autenticação via IdP (Keycloak/Auth0/Okta) — backend valida JWTs
- Testes existem (unitários + E2E)

### Pontuação

| Critério                | Peso | O que é avaliado                                                                  |
| ----------------------- | ---- | --------------------------------------------------------------------------------- |
| **DDD e Arquitetura**   | 25%  | Bounded contexts, agregados, value objects, separação de camadas, design de sagas |
| **Qualidade de Código** | 20%  | TypeScript strict, estilo consistente, nomes significativos, sem código morto     |
| **Testes**              | 20%  | Cobertura de happy path + cenários de erro                                        |
| **Frontend/UX**         | 15%  | Animações, responsividade, estética de cassino, loading states                    |
| **Provably Fair**       | 10%  | Hash chain, endpoint de verificação, cálculo correto                              |
| **Histórico Git**       | 10%  | Commits atômicos, mensagens claras, progressão lógica                             |

### Desclassificação Imediata

- Aritmética de ponto flutuante para valores monetários
- `bun run docker:up` não funciona
- Sem testes
- Código plagiado/gerado por IA sem entendimento (haverá arguição)

---

## Entrega 📦

| Item                 | Requisito                                                |
| -------------------- | -------------------------------------------------------- |
| **Repositório**      | GitHub público                                           |
| **README**           | Instruções de setup, decisões de arquitetura, trade-offs |
| **Docker Compose**   | `bun run docker:up` sobe tudo                            |
| **Usuário de teste** | Pré-configurado no Keycloak com saldo na carteira        |
| **Prazo**            | **5 dias corridos** a partir do recebimento              |

---

## Bônus ⭐

Não obrigatórios, mas diferenciam candidatos excepcionais:

- **Outbox/Inbox transacional** — Garantia de at-least-once delivery e exactly-once processing
- **Auto cashout** — Jogador define multiplicador alvo para saque automático
- **Auto bet** — Configuração de apostas automáticas com estratégia (ex: Martingale, valor fixo) e stop-loss configurável
- **Observabilidade** — OpenTelemetry + Prometheus + Grafana para métricas de jogo (RTP, volume de apostas, latência de eventos WebSocket)
- **Seed determinística para testes E2E** — Script que popula banco e broker com estado consistente e reproduzível, permitindo simular cenários específicos (ex: crash em 1.5x, sequência de rodadas)
- **Efeitos sonoros** — Feedback de áudio para aposta, cashout, crash
- **Leaderboard** — Top jogadores por lucro (24h/semana)
- **CI pipeline** — GitHub Actions rodando testes no push
- **Playwright** — Testes E2E de ponta a ponta simulando fluxos reais do jogador no browser
- **Rate limiting** — Via Kong ou na aplicação
- **Storybook** — Biblioteca de componentes
- **Fórmula da curva na UI** — Exibir a fórmula para transparência

---

## Dúvidas? ❓

Entre em contato com o recrutador.

Boa sorte — e que o multiplicador esteja ao seu favor! 🎲

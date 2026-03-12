# Company System — Backend

API REST para gerenciamento de projetos empresariais. Construída com **Fastify**, **Prisma**, **PostgreSQL** e **Redis**, rodando em **Docker** para facilitar o desenvolvimento em qualquer máquina.

---

## Stack

| Camada       | Tecnologia                  |
|--------------|-----------------------------|
| Framework    | Fastify 5                   |
| Linguagem    | TypeScript 5 (strict)       |
| ORM          | Prisma 6                    |
| Banco        | PostgreSQL 16               |
| Cache        | Redis 7                     |
| Validação    | Zod 4                       |
| Autenticação | JWT (`@fastify/jwt`)        |
| Testes       | Vitest 4 + Supertest        |
| Package Mgr  | pnpm 10                     |

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- [Node.js 20+](https://nodejs.org/) (para rodar testes localmente)
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)

---

## Configuração inicial (qualquer máquina)

### 1. Clonar o repositório

```bash
git clone <url-do-repo>
cd company-system-back
```

### 2. Criar o arquivo de ambiente

```bash
cp .env.example .env
```

O `.env` já vem configurado para o ambiente Docker. Não precisa alterar nada para rodar localmente.

```env
# Database
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=company_db
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/company_db

# App
JWT_SECRET=change-this-to-a-random-secret
PORT=3333
NODE_ENV=development
```

> Em produção, troque `JWT_SECRET` por uma string longa e aleatória.

### 3. Subir tudo com Docker

```bash
docker compose up --build
```

Isso vai:
1. Construir a imagem da aplicação
2. Subir o PostgreSQL e aguardar ele estar pronto
3. Subir o Redis e aguardar ele estar pronto
4. Aplicar as migrations do banco automaticamente
5. Iniciar a API com hot reload

Na próxima vez (imagem já construída):

```bash
docker compose up
```

### 4. Verificar se está funcionando

```
GET http://localhost:3333/health       → { "status": "ok" }
GET http://localhost:3333/docs         → Swagger UI com todos os endpoints
```

---

## Variáveis de ambiente

### `.env` — ambiente de desenvolvimento (Docker)

| Variável       | Valor padrão                                              | Descrição                                     |
|----------------|-----------------------------------------------------------|-----------------------------------------------|
| `DB_USER`      | `postgres`                                                | Usuário do PostgreSQL                         |
| `DB_PASSWORD`  | `postgres`                                                | Senha do PostgreSQL                           |
| `DB_NAME`      | `company_db`                                              | Nome do banco de desenvolvimento              |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/company_db`| URL completa usada pelo Prisma CLI local      |
| `JWT_SECRET`   | `change-this-to-a-random-secret`                          | Chave para assinar tokens JWT                 |
| `PORT`         | `3333`                                                    | Porta da API                                  |
| `NODE_ENV`     | `development`                                             | Ambiente da aplicação                         |

> **Por que `DATABASE_URL` e as variáveis separadas coexistem?**
> O Docker Compose monta a URL dinamicamente dentro do container usando `DB_USER`, `DB_PASSWORD` e `DB_NAME`. O Prisma CLI local (migrations, generate) precisa da `DATABASE_URL` diretamente no `.env`.

### `.env.test` — ambiente de testes

| Variável       | Valor                                                        | Descrição                     |
|----------------|--------------------------------------------------------------|-------------------------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/company_db_test` | Banco separado para testes |
| `JWT_SECRET`   | `test-secret`                                                | Secret para testes            |
| `REDIS_HOST`   | `localhost`                                                  | Redis via port mapping        |
| `PORT`         | `3334`                                                       | Porta separada (sem conflito) |
| `NODE_ENV`     | `test`                                                       | Ambiente de teste             |

---

## Como funciona o Docker

O projeto usa três containers que se comunicam numa rede interna chamada `company-network`:

```
┌─────────────────────────────────────────────────┐
│                  Docker Network                  │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐  │
│  │ postgres │    │  redis   │    │    app    │  │
│  │  :5432   │◄───│  :6379   │◄───│   :3333   │  │
│  └──────────┘    └──────────┘    └───────────┘  │
│       │                │                │        │
└───────┼────────────────┼────────────────┼────────┘
        │                │                │
     localhost         localhost       localhost
      :5432             :6379           :3333
```

Dentro do Docker, os containers se comunicam pelo **nome do serviço** (não localhost):
- A app conecta no banco em `postgres:5432`
- A app conecta no Redis em `redis:6379`

Do lado de fora (sua máquina), tudo é acessível via `localhost` por causa do `ports` mapeado.

### Healthchecks

O container `app` só sobe depois que PostgreSQL e Redis passarem nos healthchecks:
- PostgreSQL: `pg_isready` a cada 5s (até 5 tentativas)
- Redis: `redis-cli ping` a cada 5s (até 5 tentativas)

Isso evita que a app tente conectar antes do banco estar pronto.

### Hot reload

Os diretórios `./src` e `./prisma` são montados como volumes dentro do container. Quando você salva um arquivo no editor, a mudança aparece instantaneamente dentro do container e o `tsx watch` reinicia a aplicação.

O `node_modules` **não** é montado — ele fica dentro do container. Isso evita problemas com binários nativos compilados para sistemas operacionais diferentes (ex: `bcrypt` compila código C++).

---

## Comandos úteis

### Docker

```bash
# Subir todos os serviços
docker compose up

# Subir e reconstruir a imagem (use após mudar Dockerfile ou dependências)
docker compose up --build

# Subir em background
docker compose up -d

# Parar os containers (dados preservados nos volumes)
docker compose down

# Parar e apagar os dados (recomeço do zero)
docker compose down -v

# Ver logs da aplicação
docker compose logs app -f

# Abrir terminal dentro do container da app
docker compose exec app sh
```

### Banco de dados / Prisma

```bash
# Aplicar migrations pendentes (rode com os containers up)
pnpm prisma migrate deploy

# Criar nova migration durante desenvolvimento
docker compose exec app pnpm prisma migrate dev --name nome-da-migration

# Regenerar o Prisma Client (após mudar o schema.prisma)
pnpm prisma:generate

# Abrir o Prisma Studio (interface visual do banco)
pnpm prisma:studio
```

### Desenvolvimento local

```bash
# Instalar dependências
pnpm install

# Rodar localmente (sem Docker — requer postgres e redis no ar)
pnpm dev

# Build de produção
pnpm build

# Iniciar build de produção
pnpm start
```

---

## Rodando os testes

Os testes rodam **fora do Docker**, mas precisam do PostgreSQL no ar (via `docker compose up`).

### Setup inicial dos testes (uma vez por máquina)

```bash
# 1. Subir os containers (em outro terminal, ou em background)
docker compose up -d

# 2. Gerar o Prisma Client local
pnpm prisma:generate

# 3. Aplicar as migrations no banco de testes
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/company_db_test pnpm prisma migrate deploy
```

### Rodando os testes

```bash
# Todos os testes
pnpm test

# Interface visual (recomendado)
pnpm test:ui

# Watch mode (reroda ao salvar)
pnpm test:watch

# Com cobertura de código
pnpm test:coverage

# Só testes unitários (não precisa do banco)
pnpm test -- src/tests/unit

# Só testes de integração
pnpm test -- src/tests/integration

# Um arquivo específico
pnpm test -- src/tests/integration/auth.test.ts

# Um teste específico
pnpm test -- src/tests/integration/auth.test.ts -t "deve fazer login"
```

### Por que banco separado para testes?

O `setup.ts` deleta todos os dados do banco após cada teste (`deleteMany` em todas as tabelas). Se usasse o mesmo banco de desenvolvimento, você perderia seus dados toda vez que rodasse os testes. O banco `company_db_test` é descartável por design.

### Tipos de testes

| Tipo         | Onde                       | Velocidade | Depende do banco |
|--------------|----------------------------|------------|-----------------|
| Unitários    | `src/tests/unit/`          | ~2-3s      | Não             |
| Integração   | `src/tests/integration/`   | ~30-40s    | Sim             |

---

## Estrutura do projeto

```
company-system-back/
├── src/
│   ├── server.ts               # Entry point — inicializa e sobe o servidor
│   ├── app.ts                  # Constrói a instância Fastify com todos os plugins
│   ├── config/
│   │   ├── env.ts              # Validação das variáveis de ambiente (Zod)
│   │   ├── database.ts         # Singleton do Prisma Client
│   │   └── redis.ts            # Singleton do Redis (com retry logic)
│   ├── plugins/
│   │   ├── cors.ts             # Configuração CORS
│   │   ├── jwt.ts              # Autenticação JWT
│   │   └── swagger.ts          # Documentação Swagger/OpenAPI
│   ├── modules/
│   │   ├── auth/               # Login, registro, /me
│   │   ├── users/              # CRUD de usuários
│   │   ├── projects/           # CRUD de projetos
│   │   ├── phases/             # Fases de projetos
│   │   ├── tasks/              # Tarefas
│   │   ├── documents/          # Upload de documentos
│   │   ├── comments/           # Comentários em tarefas
│   │   └── dashboard/          # Dados agregados
│   ├── shared/
│   │   ├── middlewares/        # authenticate, authorize, error handler
│   │   ├── types/              # Tipos TypeScript e enums
│   │   └── utils/              # Utilitários (hash de senha, etc.)
│   └── tests/
│       ├── setup.ts            # Setup global do Vitest (limpa o banco)
│       ├── helpers/            # TestHelpers (cria usuários, projetos, etc.)
│       ├── unit/               # Testes unitários
│       └── integration/        # Testes de integração
├── prisma/
│   ├── schema.prisma           # Schema do banco (modelos + enums)
│   └── migrations/             # Histórico de migrations
├── Dockerfile                  # Imagem da aplicação (dev com hot reload)
├── docker-compose.yml          # Orquestração: app + postgres + redis
├── .env                        # Variáveis locais (não commitado)
├── .env.example                # Template das variáveis
├── .env.test                   # Variáveis para testes (banco separado)
├── .dockerignore               # Arquivos ignorados no build Docker
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Módulos da API

| Módulo     | Prefixo           | Roles com acesso                    |
|------------|-------------------|-------------------------------------|
| Auth       | `/api/auth`       | Público (login/registro) + protegido|
| Users      | `/api/users`      | ADMIN                               |
| Projects   | `/api/projects`   | ADMIN, GERENTE                      |
| Phases     | `/api/phases`     | ADMIN, GERENTE                      |
| Tasks      | `/api/tasks`      | Todos (leitura), GERENTE (escrita)  |
| Documents  | `/api/documents`  | Todos os autenticados               |
| Comments   | `/api/comments`   | Todos os autenticados               |
| Dashboard  | `/api/dashboard`  | Todos os autenticados               |

Roles disponíveis: `ADMIN` > `GERENTE` > `FUNCIONARIO`

A documentação completa dos endpoints está disponível em `http://localhost:3333/docs` com o servidor rodando.

---

## Checklist para nova máquina

- [ ] Docker Desktop instalado e rodando
- [ ] Node.js 20+ instalado
- [ ] pnpm instalado (`npm i -g pnpm`)
- [ ] `git clone` do repositório
- [ ] `cp .env.example .env`
- [ ] `docker compose up --build`
- [ ] Verificar `http://localhost:3333/health`
- [ ] `pnpm install` (para rodar testes localmente)
- [ ] `pnpm prisma:generate` (para o Prisma Client local)
- [ ] Criar banco de testes (ver seção de testes)

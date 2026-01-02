# 🧪 Testes - Guia Completo (Unitários + Integração)

## 📖 Visão Geral

Este projeto possui **dois tipos de testes** complementares:

- **Testes Unitários** (`src/tests/unit/`) - Rápidos, isolados, sem DB
- **Testes de Integração** (`src/tests/integration/`) - Realistas, com DB real

Juntos garantem qualidade de código em diferentes níveis.

---

## 🚀 Como Rodar

### Todos os testes (unit + integration)

```bash
npm test
```

### Só testes unitários (rápido)

```bash
npm test -- src/tests/unit
```

### Só testes de integração

```bash
npm test -- src/tests/integration
```

### Modo watch (recarrega ao salvar)

```bash
npm test -- --watch
```

### Com cobertura de código

```bash
npm test -- --coverage
```

### Um arquivo específico

```bash
npm test -- src/tests/unit/password.test.ts
npm test -- src/tests/integration/auth.test.ts
```

### Um teste específico

```bash
npm test -- src/tests/unit/password.test.ts -t "deve gerar"
npm test -- src/tests/integration/auth.test.ts -t "login"
```

### Interface visual

```bash
npm test -- --ui
```

---

## 📊 Tipos de Testes

### 🔵 Testes Unitários (Unit Tests)

**O quê:** Testa funções isoladas e lógica pura  
**Como:** Sem dependências externas, com mocks  
**Onde:** `src/tests/unit/`  
**Tempo:** 2-3 segundos ⚡

#### Arquivos disponíveis:

| Arquivo                    | O que testa                        | Testes |
| -------------------------- | ---------------------------------- | ------ |
| `password.test.ts`         | Hash e compare de senhas           | 9      |
| `auth.schemas.test.ts`     | Validação de schemas de auth       | 30+    |
| `auth.service.test.ts`     | Lógica de autenticação (com mocks) | 12+    |
| `authorize.test.ts`        | Autorização por role               | 15+    |
| `users.schemas.test.ts`    | Validação de usuários              | 20+    |
| `projects.schemas.test.ts` | Validação de projetos              | 20+    |
| `constants.test.ts`        | Constantes do projeto              | 3      |
| `enums.test.ts`            | Enums (template)                   | 3      |

**Total:** 110+ testes unitários

#### Exemplos:

```typescript
// Teste de segurança
it("deve hashear a senha antes de armazenar", async () => {
  vi.mocked(hashPassword).mockResolvedValue("$2b$10$...");

  await authService.register({
    name: "João",
    email: "joao@test.com",
    password: "senha123",
  });

  expect(hashPassword).toHaveBeenCalledWith("senha123");
});

// Teste de validação
it("deve rejeitar email inválido", () => {
  const result = loginSchema.safeParse({
    email: "not-an-email",
    password: "senha123",
  });

  expect(result.success).toBe(false);
});

// Teste de autorização
it("FUNCIONARIO não deve acessar rotas ADMIN", async () => {
  const middleware = authorize(["ADMIN"]);
  const request = createMockRequest("FUNCIONARIO");

  await middleware(request, reply);

  expect(reply.getStatusCode()).toBe(403);
});
```

**Quando usar testes unitários:**

- ✅ Lógica complexa (cálculos, transformações)
- ✅ Segurança crítica (hash, auth)
- ✅ Validações importantes
- ✅ Desenvolvimento rápido

---

### 🟢 Testes de Integração (Integration Tests)

**O quê:** Testa fluxos reais end-to-end  
**Como:** Com banco de dados, requests HTTP reais  
**Onde:** `src/tests/integration/`  
**Tempo:** 30-40 segundos ⚡

#### Arquivos disponíveis:

| Arquivo             | O que testa                | Foco          |
| ------------------- | -------------------------- | ------------- |
| `auth.test.ts`      | Register, login, endpoints | Autenticação  |
| `users.test.ts`     | CRUD de usuários           | Gerenciamento |
| `projects.test.ts`  | CRUD de projetos           | Projetos      |
| `phases.test.ts`    | Fases de projetos          | Workflow      |
| `tasks.test.ts`     | Tarefas e status           | Tasks         |
| `documents.test.ts` | Upload de documentos       | Docs          |

**Total:** 100+ testes de integração

#### Exemplos:

```typescript
// Teste de endpoint
it("deve registrar um novo usuário", async () => {
  const response = await request(app.server).post("/api/auth/register").send({
    name: "John Doe",
    email: "john@example.com",
    password: "123456",
    role: "FUNCIONARIO",
  });

  expect(response.status).toBe(201);
  expect(response.body.user.email).toBe("john@example.com");
});

// Teste de autorização
it("GERENTE não deve listar usuários de outro GERENTE", async () => {
  const gerente1 = await TestHelpers.createUser({ role: "GERENTE" });
  const gerente2 = await TestHelpers.createUser({ role: "GERENTE" });
  const projeto = await TestHelpers.createProject(gerente2.id);

  const token = TestHelpers.generateToken(app, gerente1);

  const response = await request(app.server)
    .get(`/api/projects/${projeto.id}`)
    .set("Authorization", `Bearer ${token}`);

  expect(response.status).toBe(403);
});

// Teste de fluxo completo
it("deve criar projeto, adicionar fase e tarefa", async () => {
  const gerente = await TestHelpers.createUser({ role: "GERENTE" });
  const projeto = await TestHelpers.createProject(gerente.id);
  const fase = await TestHelpers.createPhase(projeto.id);
  const tarefa = await TestHelpers.createTask(fase.id);

  expect(tarefa.phaseId).toBe(fase.id);
  expect(fase.projectId).toBe(projeto.id);
});
```

**Quando usar testes de integração:**

- ✅ Testar endpoints HTTP
- ✅ Verificar regras de autorização
- ✅ Fluxos completos do usuário
- ✅ Integração com banco de dados

---

## 📈 Comparação: Unit vs Integration

| Aspecto          | Unitários      | Integração   |
| ---------------- | -------------- | ------------ |
| Velocidade       | 2-3 seg ⚡⚡⚡ | 30-40 seg ⚡ |
| Isolamento       | Completo       | Com DB real  |
| Mock             | Tudo mockado   | Nada mockado |
| Encontra bugs em | Lógica pura    | Fluxos reais |
| Setup            | Simples        | Complexo     |
| Uso em CI/CD     | Sempre         | Frequente    |

**Ideal:** Usar ambos! Unit para rapidez, Integration para confiança.

---

## 📁 Estrutura de Testes

```
src/tests/
├── unit/                          ← Testes isolados (rápidos)
│   ├── password.test.ts
│   ├── auth.schemas.test.ts
│   ├── auth.service.test.ts
│   ├── authorize.test.ts
│   ├── users.schemas.test.ts
│   ├── projects.schemas.test.ts
│   ├── constants.test.ts
│   ├── enums.test.ts
│   ├── MOCKING_GUIDE.test.ts      ← Template de mocking
│   ├── EXAMPLES.ts                ← Exemplos para expandir
│   └── README.md                  ← Esta documentação
│
├── integration/                   ← Testes end-to-end (realistas)
│   ├── auth.test.ts
│   ├── users.test.ts
│   ├── projects.test.ts
│   ├── phases.test.ts
│   ├── tasks.test.ts
│   └── documents.test.ts
│
├── helpers/
│   └── test-helpers.ts            ← Funções auxiliares
│
└── setup.ts                       ← Configuração
```

---

## 🎯 Estratégia de Testes

### Distribuição Recomendada

```
70% Testes Unitários (rápidos, específicos)
30% Testes Integração (completos, realistas)
```

### Cobertura por Área

```
Segurança:      100% (hash, auth, autorização)
Validações:     95%+ (schemas, enums)
Lógica Crítica: 90%+ (services, negócio)
Helpers:        80%+ (utils, formatters)
Rotas:          70%+ (endpoints, fluxos)
```

---

## 💡 Como Expandir Testes

### Adicionar Novo Teste Unitário

1. Crie o arquivo:

```bash
touch src/tests/unit/novo-feature.test.ts
```

2. Use o template:

```typescript
import { describe, it, expect } from "vitest";
import { MinhaFuncao } from "../../shared/utils/minha-funcao";

describe("MinhaFuncao", () => {
  it("deve fazer algo", () => {
    const result = MinhaFuncao();
    expect(result).toBe(esperado);
  });
});
```

3. Rode:

```bash
npm test -- src/tests/unit/novo-feature.test.ts
```

**Veja exemplos em:** `src/tests/unit/EXAMPLES.ts`

### Adicionar Novo Teste de Integração

1. Crie o arquivo:

```bash
touch src/tests/integration/novo-modulo.test.ts
```

2. Use o template (copie de um existente):

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { buildApp } from "../../app";
import { TestHelpers } from "../helpers/test-helpers";
import request from "supertest";

describe("Novo Módulo", () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  it("deve fazer algo", async () => {
    const response = await request(app.server)
      .get("/api/endpoint")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
  });
});
```

3. Rode:

```bash
npm test -- src/tests/integration/novo-modulo.test.ts
```

---

## 🔍 Debugging de Testes

### Ver erro detalhado

```bash
npm test -- src/tests/unit/seu-teste.test.ts
```

### Modo verbose

```bash
npm test -- --reporter=verbose
```

### Parar no primeiro erro

```bash
npm test -- --bail
```

### Rodar testes com console.log

```bash
npm test -- src/tests/unit/seu-teste.test.ts
```

Os console.log aparecerão na saída!

---

## 📊 Cobertura de Código

### Gerar relatório

```bash
npm test -- --coverage
```

### Ver HTML interativo

```bash
npm test -- --coverage
open coverage/index.html
```

### Cobertura esperada

```
Statements:  90%+
Branches:    85%+
Functions:   95%+
Lines:       90%+
```

---

## 🎓 Padrões Usados

### 3 A's Pattern

```typescript
it("deve fazer algo", () => {
  // Arrange: preparar dados
  const input = { name: "João" };

  // Act: executar
  const result = funcao(input);

  // Assert: verificar
  expect(result).toBe(esperado);
});
```

### Testes Isolados

Cada teste é independente:

- ✅ Sem ordem de execução
- ✅ Sem estado compartilhado
- ✅ Roda em qualquer ordem

### Mocking em Unit Tests

```typescript
// Mock do Prisma
vi.mock("../../config/database");
vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

// Verificar chamada
expect(prisma.user.create).toHaveBeenCalledWith({...});
```

---

## ⚙️ Configuração

### vitest.config.ts

Já configurado no projeto com:

- SQLite para testes de integração
- Isolamento de ambiente
- Timeout apropriado

### .env.test

Configuração automática para testes

---

## 🚨 Erros Comuns

### "Cannot find module"

Verifique os caminhos de import.

### "Timeout"

Aumente em `vitest.config.ts`:

```typescript
testTimeout: 10000; // 10 segundos
```

### "Mock não funciona"

Coloque o mock ANTES do import:

```typescript
vi.mock("../../config/database");
import { prisma } from "../../config/database";
```

### "Teste flakky" (falha às vezes)

Testes de integração podem ser lentos. Aumente timeout ou paralelismo.

---

## 📋 Checklist de Testes

Antes de commitar:

- [ ] `npm test -- src/tests/unit` passa
- [ ] `npm test -- src/tests/integration` passa
- [ ] Sem erros de linting
- [ ] Cobertura mantida ou aumentada
- [ ] Novos testes para novos features
- [ ] Nomes de testes descritivos

---

## 🤝 Boas Práticas

### DO ✅

- Testes rápidos (unit) durante desenvolvimento
- Testes realistas (integration) antes de commit
- Nome descritivo: `deve validar email inválido`
- Um assertion principal por teste
- Usar helpers do TestHelpers

### DON'T ❌

- Testes frágeis que falham por nada
- Testes muito complexos (divida em menores)
- Dependências entre testes
- Teste implementação, teste comportamento
- Esperar dados específicos de BD

---

## 📚 Recursos

| Ferramenta | Link                                     | Uso                  |
| ---------- | ---------------------------------------- | -------------------- |
| Vitest     | https://vitest.dev                       | Framework de testes  |
| Zod        | https://zod.dev                          | Validação de schemas |
| Prisma     | https://www.prisma.io                    | ORM                  |
| Fastify    | https://www.fastify.io                   | Framework HTTP       |
| Supertest  | https://github.com/visionmedia/supertest | Testes HTTP          |

---

## 🎯 Próximos Passos

### Hoje

```bash
npm test -- src/tests/unit          # Rápido, desenvolvimento
```

### Antes de Commit

```bash
npm test                             # Todos os testes
npm test -- --coverage               # Cobertura
```

### Antes de Deploy

```bash
npm test -- --coverage               # Manter padrão
```

---

## 💬 Dúvidas?

### Como mockar algo novo?

Veja `src/tests/unit/MOCKING_GUIDE.test.ts`

### Preciso de exemplos?

Veja `src/tests/unit/EXAMPLES.ts`

### Como testar um novo service?

Copie de `src/tests/unit/auth.service.test.ts`

---

**Tudo testado = código confiável = deploy sem medo! 🚀**
├── auth.service.test.ts # Testes do serviço de autenticação
├── authorize.test.ts # Testes do middleware de autorização
├── users.schemas.test.ts # Testes de validação dos schemas de usuários
├── projects.schemas.test.ts # Testes de validação dos schemas de projetos
├── constants.test.ts # Testes de constantes
└── enums.test.ts # Testes de enums

````

## 🚀 Como Rodar

### Todos os testes unitários
```bash
npm test -- src/tests/unit
# ou
pnpm test -- src/tests/unit
````

### Um arquivo específico

```bash
npm test -- src/tests/unit/password.test.ts
npm test -- src/tests/unit/auth.service.test.ts
```

### Em modo watch (recarrega ao salvar)

```bash
npm test -- src/tests/unit --watch
```

### Com cobertura de código

```bash
npm test -- src/tests/unit --coverage
```

### Apenas um describe específico

```bash
npm test -- src/tests/unit/password.test.ts -t "hashPassword"
```

### Apenas um teste específico

```bash
npm test -- src/tests/unit/password.test.ts -t "deve gerar um hash"
```

## 📊 O que cada teste cobre

### `password.test.ts` (9 testes)

- ✅ Hash generation básico
- ✅ Salt aleatório (hashes diferentes para mesma senha)
- ✅ Comprimento correto do hash (bcrypt = 60 caracteres)
- ✅ Compatibilidade com senhas vazias, longas, especiais e acentuadas
- ✅ Validação de senhas corretas
- ✅ Rejeição de senhas incorretas
- ✅ Case-sensitivity
- ✅ Fluxo completo registro + login

**Por que é crítico:** Segurança de dados sensíveis. Hash errado = senhas expostas.

---

### `auth.schemas.test.ts` (30+ testes)

- ✅ Login com dados válidos
- ✅ Rejeição de emails inválidos
- ✅ Validação de comprimento de senha (min 6)
- ✅ Rejeição de campos faltando
- ✅ Validação de register com todos os campos
- ✅ Diferentes roles (ADMIN, GERENTE, FUNCIONARIO)
- ✅ Emails válidos diversos
- ✅ Senhas com caracteres especiais

**Por que é crítico:** Evita dados inválidos entrem no banco. Primeira camada de validação.

---

### `auth.service.test.ts` (12+ testes)

- ✅ Registro de novo usuário
- ✅ Email já cadastrado
- ✅ Hashing correto da senha
- ✅ Login com credenciais corretas
- ✅ Rejeição de senha incorreta
- ✅ Usuário desativado bloqueado
- ✅ Não retorna senhas nas respostas
- ✅ Busca de usuário por ID
- ✅ Seleção correta de campos

**Por que é crítico:** Lógica de segurança e autenticação. Bugs aqui = falhas críticas.

---

### `authorize.test.ts` (15+ testes)

- ✅ ADMIN tem acesso a todas as rotas
- ✅ GERENTE tem acesso apenas às suas rotas
- ✅ FUNCIONARIO tem acesso apenas às suas rotas
- ✅ Retorna 403 quando bloqueado
- ✅ Case-sensitive nas roles
- ✅ Múltiplas roles funcionam corretamente

**Por que é crítico:** Controle de acesso. Bug = usuários acessando dados de outros.

---

### `users.schemas.test.ts` (20+ testes)

- ✅ Validação de usuário completo
- ✅ Comprimento de nome (min 3)
- ✅ Validação de email
- ✅ Validação de role
- ✅ Campos opcionais em update
- ✅ Atualização parcial de usuário
- ✅ Validação de isActive booleano

**Por que é crítico:** Garante dados de usuário sempre válidos.

---

### `projects.schemas.test.ts` (20+ testes)

- ✅ Validação de projeto completo
- ✅ Comprimento de título (min 3)
- ✅ Validação de UUID do manager
- ✅ Prioridades válidas
- ✅ Budget positivo
- ✅ Datas em formato datetime
- ✅ Validação de membro adicionado
- ✅ Status válidos do projeto

**Por que é crítico:** Integridade dos dados de projetos.

---

## 💡 Exemplo: Como adicionar um novo teste

Se você criar uma nova função crítica, como validação de email:

```typescript
// src/shared/utils/email.ts
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

Crie o teste:

```typescript
// src/tests/unit/email.test.ts
import { describe, it, expect } from "vitest";
import { isValidEmail } from "../../shared/utils/email";

describe("Email Utils", () => {
  it("deve validar emails válidos", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("test@domain.co.uk")).toBe(true);
  });

  it("deve rejeitar emails inválidos", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
  });
});
```

Rode:

```bash
npm test -- src/tests/unit/email.test.ts
```

## 🎯 Próximos testes a adicionar

- [ ] Testes do `users.service.ts`
- [ ] Testes do `projects.service.ts`
- [ ] Testes do `tasks.service.ts`
- [ ] Testes do `documents.service.ts`
- [ ] Testes do `authenticate.ts` middleware
- [ ] Testes de utils (date helpers, formatters, etc)
- [ ] Testes de transformações de dados

## 📈 Cobertura esperada

```
Statements   : 80%+
Branches     : 75%+
Functions    : 80%+
Lines        : 80%+
```

## 🔗 Relacionados

- Testes de integração: [src/tests/integration/](../integration/)
- Setup de testes: [src/tests/setup.ts](../setup.ts)
- Helpers: [src/tests/helpers/](../helpers/)

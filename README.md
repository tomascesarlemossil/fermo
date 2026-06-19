# Fermo · Plataforma

Plataforma SaaS para fábrica de calçados em couro **sob encomenda** (private label, Franca/SP).
Stack full-stack Next.js com banco real, multi-tenant, RBAC e auditoria.

> Esta versão implementa a **Fase 0 (Fundação)** + a **Fase 1 (espinha dorsal comercial)**
> do [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md): site → lead → CRM → orçamento →
> aprovação no portal do cliente → pedido → ordem de produção.

## Stack

- **Next.js 14** (App Router, Server Actions, Route Handlers) + **TypeScript**
- **Prisma** + **PostgreSQL** (Neon em produção; Postgres local em dev)
- **Auth.js (NextAuth v5)** — credenciais, sessão JWT
- **Tailwind CSS** (identidade Fermo) · **TanStack Query** · **Zod**
- **Vitest** (testes de isolamento multi-tenant + e2e do caminho feliz)

## Arquitetura (resumo)

- **Multi-tenant single-database:** toda entidade de negócio tem `tenantId`. Uma
  **Prisma Client Extension** injeta `tenantId` automaticamente em todo
  create/find/update/delete, lendo de um `AsyncLocalStorage`. O `tenantId` é
  **sempre resolvido pela sessão no servidor**, nunca enviado pelo front.
  Operações de negócio fora de um contexto de tenant **falham explicitamente**.
- **RBAC:** `Role` + `Permission` (catálogo global), checagem por ação no servidor
  (`can(session, "quote:approve")`).
- **Auditoria:** segunda Prisma Extension grava `AuditLog` (before/after, usuário,
  tenant, origem) em toda escrita relevante.

Mapa de pastas:

```
prisma/schema.prisma     modelo de dados do núcleo (Fases 0–1)
prisma/seed.ts           RBAC + 2 tenants (o 2º habilita o teste de isolamento)
src/lib/                 prisma (extensions), tenant-context, auth, rbac, session
src/server/              regras de negócio (crm, quotes, orders, numbering)
src/app/                 site público, /login, /app (admin), /portal/[token]
tests/                   isolation.test.ts + flow.test.ts
reference/               protótipo de UX original (não faz parte do build)
```

## Rodar localmente

Requisitos: Node 18+ e um PostgreSQL acessível.

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL / DIRECT_URL / AUTH_SECRET
npx prisma migrate dev      # cria o schema
npm run seed                # popula RBAC + dados de demonstração
npm run dev                 # http://localhost:3000
```

### Contas de demonstração (tenant `fermo`)

| Papel      | E-mail                     | Senha       |
|------------|----------------------------|-------------|
| Admin      | `diego@fermo.com.br`       | `diegoadmin`|
| Comercial  | `comercial@fermo.com.br`   | `fermo123`  |
| Produção   | `producao@fermo.com.br`    | `fermo123`  |
| Cliente    | `cliente@marcademo.com.br` | `fermo123`  |

Um segundo tenant (`atelie`, `admin@atelie.com.br` / `atelie123`) existe para
provar o isolamento multi-tenant.

## Fluxo demonstrável (caminho feliz)

1. Visitante envia um lead pelo site (`/`) ou pelo **configurador** (`/configurador`).
2. O lead cai no CRM (`/app/crm/leads`); o comercial **qualifica** e **converte** em cliente.
3. Cria um **orçamento** (`/app/quotes/new`) com cálculo básico e versão inicial.
4. **Envia** ao cliente → gera link do **portal** (`/portal/<token>`).
5. O cliente **aprova** no portal → o sistema gera **pedido** + **ordem de produção**.
6. A OP aparece no kanban de **Produção** (`/app/production`).

## Validação (rodar a cada etapa)

```bash
npx prisma migrate dev
npm run lint
npm run typecheck
npm run test     # isolamento multi-tenant + e2e do caminho feliz
npm run build
```

## Deploy (Vercel + Neon)

1. Crie um projeto no Neon e copie as connection strings (pooled e direct).
2. Na Vercel, importe o repositório e configure as variáveis de ambiente:
   `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `AUTH_SECRET`, `AUTH_TRUST_HOST=true`,
   `DEFAULT_TENANT_SLUG=fermo`.
3. O `build` roda `prisma generate && next build`. Após o primeiro deploy, aplique as
   migrations (`npx prisma migrate deploy`) e rode o seed uma vez.

© 2026 Fermo · Private Label Shoes · Franca/SP

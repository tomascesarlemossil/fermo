# Fermo · Plataforma

Plataforma SaaS para fábrica de calçados em couro **sob encomenda** (private label, Franca/SP).
Stack full-stack Next.js com banco real, multi-tenant, RBAC e auditoria.

> Esta versão implementa as **Fases 0–2** do [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md):
> - **Fase 0** — fundação multi-tenant + RBAC + auditoria + Auth.js.
> - **Fase 1** — site → lead → CRM → orçamento → portal do cliente → pedido → ordem de produção.
> - **Fase 2** — catálogo, variantes, materiais, **ficha técnica versionada**, **BOM multinível**
>   (com explosão e custo) e **configurador data-driven** no site.
> - **Fase 3** — MES: **roteiro** da OP por setor, **apontamento** (com **QR Code**) e
>   **qualidade** (inspeções + defeitos).
> - **Fase 4** — Suprimentos: **fornecedores**, **estoque**, **compras**, **MRP**
>   (a partir da BOM) e **portal da facção**.
> - **Fase 5** — Financeiro & Logística: **contas a pagar/receber**, fluxo de caixa,
>   **faturamento**, comissões, custos (orçado×receita), **expedição** e bloqueio por inadimplência.
> - **Fase 6** — Inteligência: **relatórios** com gráficos, **automações** configuráveis,
>   **assistente** (estimativa de preço + anomalias) e **PWA** (instalável).

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

### PLM (Fase 2)

- **Catálogo** (`/app/catalog`): produtos, variantes, grade. No detalhe do produto:
  **BOM multinível** (materiais e submontagens) com **explosão + custo por par**, e
  **ficha técnica versionada** (cada salvamento gera nova versão imutável).
- **Materiais** (`/app/materials`): insumos com custo por unidade, usados na BOM.
- O **configurador** (`/configurador`) lista os modelos a partir do catálogo do tenant.

### Produção / MES (Fase 3)

- Ao aprovar um orçamento, a OP nasce com **roteiro por setor** (Corte → Expedição).
- Em **Produção** (`/app/production`), abra uma OP para ver o roteiro, **apontar pares**
  por etapa (avança o status da OP e do pedido) e o **QR Code** do chão de fábrica.
- **Qualidade** (`/app/quality`): inspeções com aprovados/reprovados, resultado
  automático (PASS/PARTIAL/FAIL) e defeitos.

## Validação (rodar a cada etapa)

```bash
npx prisma migrate dev
npm run lint
npm run typecheck
npm run test     # 25 testes: isolamento + e2e + PLM + MES + suprimentos + financeiro + IA
npm run build
```

## Deploy (Vercel + Neon)

1. Crie um projeto no Neon e copie as duas connection strings (**pooled** e **direct**).
2. Na Vercel → Project → **Settings → Environment Variables**, configure (Production):
   - `DATABASE_URL` = string **pooled** do Neon (`...-pooler...?sslmode=require`)
   - `DIRECT_URL` = string **direct** do Neon (`...?sslmode=require`)
   - `AUTH_SECRET` = um segredo forte (`openssl rand -base64 32`)
   - `AUTH_TRUST_HOST` = `true`
   - `DEFAULT_TENANT_SLUG` = `fermo`
3. Faça o deploy. O `build` já roda **`prisma migrate deploy`** e o **seed** (idempotente),
   então o banco do Neon é criado/atualizado e as contas demo passam a existir
   automaticamente — o login funciona no primeiro deploy.

> **Login não conclui?** Quase sempre é falta de `AUTH_SECRET` ou `DATABASE_URL`/`DIRECT_URL`
> na Vercel (sem banco/segredo não há como autenticar). Confira as 5 variáveis acima e
> redeploye. O fluxo de login usa navegação completa após autenticar, garantindo que o
> cookie de sessão seja lido pelo servidor.

© 2026 Fermo · Private Label Shoes · Franca/SP

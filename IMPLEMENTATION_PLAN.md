# IMPLEMENTATION_PLAN.md — Plataforma Fermo (Fábrica de calçados sob encomenda)

> Documento de arquitetura e execução. Fonte da verdade para o Claude Code.
> Toda decisão técnica relevante é registrada aqui (seção "Decisões").

---

## 0. Contexto e princípio condutor

Fábrica de calçados em couro (Franca/SP), private label, sob encomenda. Operada por um time enxuto.

**Princípio nº 1 — valor antes de largura.** Não construir as 70+ entidades de uma vez. Construir **uma espinha dorsal de ponta a ponta** que já gere valor real, e então alargar fase a fase. O risco fatal deste projeto é escopo: ele é mitigado por *vertical slices* + *phase gates*.

**Princípio nº 2 — cada etapa fica executável e validada.** Após cada bloco: `prisma migrate`, `lint`, `typecheck`, `test`, `build`. Se não passa, não avança.

---

## 1. Decisões de arquitetura (registradas)

| # | Decisão | Justificativa |
|---|---------|---------------|
| D1 | **Stack v1 = Next.js 14 (App Router) full-stack** — Server Actions + Route Handlers — TypeScript, Prisma, **PostgreSQL (Neon)**, Tailwind, Zod, TanStack Query, Auth.js. | O prompt permite "usar Next.js server-side numa primeira versão". Operador solo + deploy Vercel + time-to-value. NestJS separado fica para quando houver time/escala. |
| D2 | **Adiar Docker / Redis / BullMQ / S3 na v1.** Usar **Neon** (Postgres serverless, pooled), **Vercel** (deploy/CI), **Vercel Blob** (uploads), **Vercel Cron** (jobs agendados). | Mesma stack do AgoraEncontrei. Roda na hora, sem infra para manter. Docker/filas entram na Fase 6 se o volume exigir. |
| D3 | **Multi-tenant single-database** com coluna `tenantId` em toda entidade de negócio. `tenantId` **sempre resolvido pela sessão** (nunca do front). Prisma Client Extension injeta `where: { tenantId }` automaticamente. | Isolamento simples e seguro para SaaS inicial. RLS no Postgres pode ser adicionado depois sem refatorar. |
| D4 | **RBAC** via `Role` + `Permission`. Checagem **no servidor**, por ação (`can(user, 'quote:approve')`). | Atende a matriz de perfis/permissões do prompt (seção 28). |
| D5 | **Auditoria** via tabela `AuditLog` + Prisma Extension capturando before/after, usuário, tenant, origem. | Requisito transversal (seção 2). |
| D6 | **Vertical slice primeiro:** `site → lead → orçamento → aprovação no portal → pedido → ordem de produção`. Largura só depois. | Entrega a "primeira entrega funcional" (seção 40) em versão enxuta e demonstrável. |
| D7 | **Reaproveitar o que já existe:** o **site público da Fermo** (já no ar em fermo-beryl.vercel.app) e o **módulo de gestão demo** (kanban, OPs, financeiro, relatórios) como referência de UX e como telas a portar sobre o banco real. | Não recomeçar do zero; acelerar. |
| D8 | **Real-time v1 = polling/revalidação** (TanStack Query + Server Actions). WebSockets/Pusher só quando o chão de fábrica exigir. | Evita complexidade prematura. |

---

## 2. Modelo multi-tenant (resumo de implementação)

- Toda tabela de negócio tem `tenantId String` (indexado).
- Sessão (Auth.js) carrega `userId`, `tenantId`, `roleId`.
- **Prisma Extension** (`$allModels.$allOperations`) injeta `tenantId` em `findMany/findFirst/create/update/delete` lendo de um `AsyncLocalStorage` setado por middleware/route.
- Testes obrigatórios de isolamento: usuário do tenant A nunca lê/escreve dados do tenant B.

---

## 3. Fases (resequenciadas para valor)

### Fase 0 — Fundação (semana 1)
Repo + Prisma/Neon + schema núcleo + Auth.js + multi-tenant + RBAC + AuditLog + layout administrativo + seed demo + deploy Vercel.
**Gate:** login funciona; teste de isolamento passa; deploy verde.

### Fase 1 — Espinha dorsal comercial (a "primeira entrega funcional")
Site público (existe) → **captura de lead** → **CRM** (pipeline) → **orçamento** (cálculo básico + versões) → **portal do cliente** (aprova/recusa) → **pedido** → **ordem de produção** gerada.
**Gate:** fluxo ponta a ponta com banco real; e2e do caminho feliz passa.

### Fase 2 — Produto, Ficha Técnica, BOM, Grade, Configurador
Catálogo, variantes, grade de numeração, materiais, ficha técnica versionada, BOM multinível, configurador passo a passo no site alimentando o CRM.

### Fase 3 — Produção (PCP/MES)
Ordem de produção detalhada, roteiro, kanban por setor, apontamento por QR Code, qualidade (inspeções/defeitos).

### Fase 4 — Suprimentos
Estoque (matéria-prima/processo/acabado), reserva, **MRP**, compras, fornecedores, facções + portal da facção.

### Fase 5 — Financeiro & Logística
Custos (orçado×realizado), contas a pagar/receber, fluxo de caixa, comissões, faturamento, expedição, rastreamento, regras de bloqueio (sinal/inadimplência).

### Fase 6 — Inteligência & escala
IA (briefing/estimativas/anomalias), automações configuráveis, relatórios avançados, configurador 3D, PWA offline, Docker/filas se o volume pedir.

---

## 4. Entidades do núcleo (Fases 0–1) — subconjunto das 70+

`Tenant, Company, User, Role, Permission, AuditLog, Customer, CustomerContact, Address, Lead, Opportunity, Product (catálogo básico), ConfigRequest (configurador), Quote, QuoteVersion, SalesOrder, SalesOrderItem, SizeGrid, ProductionOrder, File, Notification.`

O restante das entidades entra nas fases correspondentes (PLM/BOM na 2, MES na 3, estoque/MRP/compras/facção na 4, financeiro na 5).

---

## 5. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Escopo (o maior) | Vertical slice + phase gates. Nada de "todas as telas". |
| Prisma em serverless (conexões) | Neon pooled URL / Prisma Accelerate. |
| Validar a cada etapa | Neon branch por ambiente (dev/preview/prod); CI roda migrate+test+build. |
| Autenticação | Auth.js (credenciais) — não reinventar sessão. |
| Multi-tenant furado | Teste automatizado de isolamento como critério de gate da Fase 0. |
| Construir antes de validar comercialmente | Mostrar a Fase 1 ao primeiro cliente e cobrar por fase. |

---

## 6. Critérios de aceite da v1 (Fases 0–1)

- Sobe em Vercel + Neon (sem Docker na v1).
- Banco por migrations; seed funciona; conta demo no README.
- Login + RBAC + **isolamento multi-tenant testado**.
- Lead do site cai no CRM.
- Orçamento criado, enviado e **aprovado pelo portal do cliente**.
- Aprovação **gera pedido** e **ordem de produção**.
- `lint`, `typecheck`, `test` (e2e do caminho feliz) e `build` verdes.
- README + este `IMPLEMENTATION_PLAN.md` atualizados.

---

## 7. Comandos de validação (rodar a cada etapa)

```bash
npx prisma migrate dev
npm run lint
npm run typecheck
npm run test
npm run build
```

---

## 8. Reaproveitamento imediato

- **Site público:** já existe (projeto `fermo`, no ar). Portar para ler catálogo do banco.
- **Telas de gestão (referência de UX):** kanban de produção, OPs, financeiro, relatórios e CMS já prototipados — reconstruir sobre Prisma/RBAC. *(Protótipo preservado em `reference/fermo-plataforma.jsx`.)*
- **Identidade visual:** espresso `#161009`, dourado `#C79A4B`, Cinzel + Cormorant + Inter.

---

## 9. Status de execução

### ✅ Fase 0 — Fundação (concluída)
- Projeto Next.js 14 (App Router) + TypeScript + Tailwind (identidade Fermo).
- Prisma + PostgreSQL; schema do núcleo migrado (`prisma/migrations`).
- **Multi-tenant** via Prisma Client Extension + `AsyncLocalStorage` (`tenantId`
  resolvido pela sessão, nunca pelo front; operações sem contexto falham).
- **RBAC** (`Role`/`Permission`, `can()`), **AuditLog** via Extension (before/after).
- **Auth.js (NextAuth v5)** credenciais; layout administrativo com guarda de sessão.
- Seed com 2 tenants e contas demo.
- **Gate:** login funciona (verificado em runtime); teste de isolamento passa; build verde. ✔

### ✅ Fase 1 — Espinha dorsal comercial (concluída)
- Site público + **configurador** → **captura de lead** (`/api/leads`, tenant server-side).
- **CRM**: leads, qualificação, conversão em cliente + oportunidade.
- **Orçamento** com cálculo básico e versões (`QuoteVersion` + snapshot).
- **Portal do cliente** (`/portal/<token>`): aprova/recusa sem login.
- Aprovação **gera Pedido + Ordem de Produção** (transacional, idempotente).
- Kanban de **Produção** por setor.
- **Gate:** fluxo ponta a ponta com banco real; e2e do caminho feliz passa. ✔

### ✅ Fase 2 — Produto, Ficha Técnica, BOM, Grade, Configurador (concluída)
- **Catálogo** de produtos (CRUD) com preço base e grade de numeração.
- **Variantes** de produto (cor/atributos).
- **Materiais** (insumos) com custo por unidade.
- **Ficha técnica versionada** (`TechSheet`/`TechSheetVersion`): cada salvamento
  cria uma nova versão imutável; histórico preservado.
- **BOM multinível** (`BomItem`): componentes de material **ou** subprodutos
  (montagens). Explosão recursiva com **rollup de custo** e proteção a ciclos.
- **Configurador do site agora é data-driven**: os modelos vêm do catálogo real
  do tenant e o resultado alimenta o CRM (lead + `ConfigRequest`).
- Novos modelos entram na proteção multi-tenant e na auditoria.
- **Gate:** migrate + isolamento + BOM/ficha cobertos por teste; build verde. ✔

### ✅ Fase 3 — Produção (PCP/MES) (concluída)
- **Roteiro detalhado da OP** (`ProductionStep`) por setor (Corte, Pesponto,
  Montagem, Acabamento, Expedição), gerado automaticamente na aprovação do orçamento.
- **Apontamento de produção** (`ProductionEvent`): soma pares por etapa, evolui o
  status da etapa (Pendente→Em produção→Concluído) e **recalcula o status macro da
  OP e do pedido** (em produção / expedido).
- **QR Code** por OP (gerado no servidor) apontando para a tela de apontamento —
  uso no chão de fábrica.
- **Qualidade**: inspeções (`QualityInspection`) com aprovados/reprovados, resultado
  automático (PASS/PARTIAL/FAIL) e **defeitos** (`QualityDefect`) com severidade.
  Visão consolidada em `/app/quality`.
- Novos modelos protegidos pela extension multi-tenant e auditoria; RBAC
  `quality:read/write`.
- **Gate:** roteiro/apontamento/qualidade cobertos por teste; build verde. ✔

### ✅ Fase 4 — Suprimentos (concluída)
- **Fornecedores** (material e facção). **Estoque** com razão de movimentos
  (IN/OUT/RESERVE/RELEASE/ADJUST) + saldo/reserva/disponível.
- **Compras**: criar/enviar/receber PO; recebimento dá **entrada no estoque**.
- **MRP**: explode a BOM dos pedidos ativos, subtrai estoque e sugere compra.
- **Portal da facção** (token público) para PO terceirizada.
- Orçamento passou a permitir vincular **produto por linha** (alimenta o MRP).
- **Gate:** estoque/recebimento/MRP cobertos por teste; build verde. ✔

### ✅ Fase 5 — Financeiro & Logística (concluída)
- **Contas a pagar/receber** com baixa; vencido derivado; **fluxo de caixa** mensal.
- **Faturamento** (NF) gera a receber; **comissões** como conta a pagar.
- **Custos**: orçado (BOM) × receita com **margem** no detalhe do pedido.
- **Regra de bloqueio**: cliente inadimplente não expede.
- **Expedição** com transportadora/rastreio (marca pedido como SHIPPED).
- **Gate:** faturamento/comissão/custo/bloqueio/expedição testados; build verde. ✔

### ✅ Fase 6 — Inteligência & escala (concluída no que agrega valor agora)
- **Relatórios** com gráficos (funil comercial, produção, fluxo de caixa, top clientes).
- **Automações configuráveis** (gatilho → ação "notify"), disparadas nos eventos
  de negócio (lead criado, orçamento aprovado, pedido criado).
- **Assistente (IA heurística, sem API externa)**: estimativa de preço (BOM × markup)
  e **detecção de anomalias** (margem baixa, inadimplência, OP parada).
- **PWA**: manifest + theme/ícone (instalável). *Service worker offline, Docker/filas
  e configurador 3D ficam para quando o volume exigir (conforme D2/plano).* 
- **Gate:** estimativa/anomalias/automação testados; build verde. ✔

### 🎨 UX/Mobile
- Layout administrativo refeito para mobile: sidebar vira **drawer** com
  hambúrguer; cabeçalho fixo só no desktop; padding responsivo; tabelas com
  rolagem horizontal. (Antes a sidebar fixa espremia o conteúdo no celular.)

**Validação atual:** `lint` ✔ · `typecheck` ✔ · `test` (25/25) ✔ · `build` ✔ (37 rotas)

### Itens deferidos (escala — D2)
Service worker offline completo, Docker/Redis/BullMQ, S3/Blob dedicado e
configurador 3D entram quando o volume justificar.

> **Nota técnica (multi-tenant + tipos):** como a Extension injeta `tenantId` em
> tempo de execução, os tipos gerados do Prisma ainda o exigem em `create`. As
> chamadas de escrita usam `as any` no `data` (o `tenantId` real vem sempre do
> contexto da sessão). Trade-off conhecido do padrão; o isolamento é garantido
> pela Extension e coberto por teste automatizado.

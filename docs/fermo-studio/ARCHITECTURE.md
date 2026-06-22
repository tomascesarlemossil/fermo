# Fermo Studio — Arquitetura

Integrado ao app Fermo (Next.js 14 App Router, Prisma/Postgres, Auth.js, multi-tenant + RBAC + auditoria).

## Princípios
- **Reaproveitar** o que existe (auth, tenant, RBAC, quotes/portal, MES, financeiro).
- **Preço é do servidor** — o front nunca é fonte de verdade de valor.
- **Snapshots imutáveis** — orçamento guarda preço/regras/versão usados.
- **Aditivo e seguro** — migrations só adicionam; nada é apagado.

## Rotas
Público:
- `/studio` — landing premium.
- `/studio/modelos` — catálogo de modelos.
- `/studio/configurador/[slug]` — configurador 3D + preço ao vivo + grade.
- `/studio/orcamento/[token]` — orçamento (resumo + impressão/PDF) — reusa portal.
- `/studio/projeto/[id]` — projeto salvo.

Admin (padrão do projeto = `/app`):
- `/app/fermo-studio` — dashboard (funil, conversão, ticket médio).
- `/app/fermo-studio/modelos`, `/materiais`, `/opcoes`, `/precificacao`, `/projetos`.

## Camadas
```
src/lib/studio/            tipos puros, design tokens do studio
src/server/studio/
  catalog.ts               modelos, opções, categorias
  pricing.ts               MOTOR DE PREÇO versionado + breakdown + snapshot
  projects.ts              salvar/duplicar configuração, gerar orçamento
  payments.ts              camada de pagamento (sandbox + interface p/ gateway)
prisma/schema.prisma       models do Studio (aditivos)
src/app/studio/*           rotas públicas
src/app/app/fermo-studio/* rotas admin
```

## Modelo de dados (resumo)
`ShoeCategory · ShoeModel(+editableMeshes) · ShoeModelAsset · StudioOption(group) ·
PriceProfile · PriceProfileVersion · VolumeDiscount · StudioProject(+snapshot+token) ·
BrandAsset · Payment(+installments) · TechnicalReview · StudioEvent(funil)`
Reusa: `Material, Quote/QuoteVersion, SalesOrder, ProductionStep, Customer, AuditLog`.

## Configurador 3D
- `model-viewer` + GLB self-hosted; cor por variante e (quando o GLB tiver malhas nomeadas)
  por malha via `ShoeModel.editableMeshes` (mapa malha→componente comercial).
- Fallback 2D quando o 3D não carregar.
- Estado de personalização salvo em `StudioProject.selection` (JSON).

## Pagamentos
Ver `PRICING_ENGINE.md` e `PAYMENTS.md`. Provider via env, webhook idempotente,
status sempre confirmado no servidor.

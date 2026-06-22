# Fermo Studio — Progresso de implementação

> Plataforma B2B de calçados sob encomenda integrada ao sistema Fermo.
> "Crie sua marca. Configure seu calçado. Receba seu orçamento na hora."

Status legenda: ✅ concluído · 🟡 parcial/scaffold · ⬜ pendente

## Fase 1 — Auditoria, arquitetura, modelo de dados, migrations
- ✅ Auditoria do repositório e mapa de arquitetura (`ARCHITECTURE.md`)
- ✅ Modelo de dados do Studio (Prisma, aditivo) + migration segura
- ✅ Documentos base (`README`, `ARCHITECTURE`, `PRICING_ENGINE`, este progresso)

## Fase 2 — Catálogo, materiais, componentes, admin básico, seeds
- ✅ Categorias, modelos, opções (materiais/solas/forros/cadarços/embalagem/personalizações)
- ✅ Seeds demonstrativos (claramente marcados como DEMO)
- ✅ Admin: `/app/fermo-studio` (dashboard, modelos, opções, precificação)
- 🟡 Admin CRUD completo de modelos/opções (criação via seed + edição de preço; formulários de cadastro em evolução)

## Fase 3 — Configurador, personalização, salvamento, viewer 3D, malhas
- ✅ Viewer 3D (model-viewer + GLB) dirigido por `editableMeshes` do modelo
- ✅ Estado da personalização + preço ao vivo + salvamento de projeto (StudioProject)
- 🟡 Edição por malha individual (depende de GLBs com malhas nomeadas; infra + mapeamento prontos, assets DEMO)
- ⬜ Upload/versionamento de GLB no admin (infra de asset pronta; UI de upload pendente)

## Fase 4 — Motor de preços, regras, grade, orçamento, PDF
- ✅ Motor de preços server-side versionado + breakdown + snapshot imutável no orçamento
- ✅ Faixas de quantidade (VolumeDiscount) editáveis
- ✅ Grade de numeração com validação (soma = quantidade)
- ✅ Página de orçamento com resumo + impressão (print-to-PDF)
- 🟡 Regras de compatibilidade (modelo + serviço; UI de cadastro pendente)
- ⬜ PDF server-side (lib dedicada) — hoje via página imprimível

## Fase 5 — Cliente, checkout, pagamentos, pedidos
- 🟡 Geração de pedido a partir do orçamento aprovado (reusa fluxo existente)
- 🟡 Pagamentos: camada de serviço + modelo `Payment` + **modo sandbox** (sem gateway real)
- ⬜ Integração real Asaas/Mercado Pago/PIX/boleto/cartão (env + webhook idempotente documentados)

## Fase 6 — Produção, aprovações, notificações, automações
- ✅ Timeline de produção (reusa MES `ProductionStep`)
- 🟡 Revisão técnica (modelo `TechnicalReview` + serviço; UI básica)
- 🟡 Automações/notificações (reusa motor existente)

## Fase 7 — Analytics, segurança, otimização, testes, documentação
- 🟡 Eventos de funil (modelo + captura básica)
- ✅ Segurança: RBAC, multi-tenant, validação Zod cliente+servidor, preço só no servidor
- ✅ Testes do motor de preço + jornada do Studio
- 🟡 Documentação (em evolução nesta pasta)

## Itens que dependem de credenciais (entregues como interface + serviço + env + sandbox + doc)
- Pagamentos (PAYMENT_PROVIDER), Storage de arquivos (STORAGE_*), E-mail/WhatsApp, IA (AI_*), frete.
- Ver `PAYMENTS.md`, `THREE_D_ASSETS.md`, `DEPLOYMENT.md`, `SECURITY.md`.

## Como rodar / validar
```bash
npm install
npx prisma migrate deploy
npm run seed
npm run dev          # /studio
npm run lint && npm run typecheck && npm run test && npm run build
```

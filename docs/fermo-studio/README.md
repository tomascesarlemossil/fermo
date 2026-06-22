# Fermo Studio

Plataforma B2B de calçados sob encomenda dentro do site da Fermo. O cliente cria sua
marca, configura o calçado em 3D, recebe orçamento instantâneo, aprova e acompanha a
produção — tudo online.

- Visão geral e progresso: `IMPLEMENTATION_PROGRESS.md`
- Arquitetura: `ARCHITECTURE.md`
- Motor de preço: `PRICING_ENGINE.md`
- Assets 3D (troca dos modelos demonstrativos pelos reais): `THREE_D_ASSETS.md`
- Pagamentos (ativação do gateway): `PAYMENTS.md`
- Segurança: `SECURITY.md` · Deploy: `DEPLOYMENT.md` · Admin: `ADMIN_GUIDE.md`

## Rotas públicas
`/studio` · `/studio/modelos` · `/studio/configurador/[slug]` · `/studio/orcamento/[token]`

## Admin
`/app/fermo-studio` (dashboard, modelos, opções, precificação, projetos)

> Dados marcados como **DEMO** são demonstrativos até a Fermo configurar os valores reais.

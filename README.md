# Fermo · Plataforma (site + sistema + CMS)

Versão **pronta para rodar e publicar**, sem banco de dados — login e edições do site funcionam no próprio navegador. Ideal para demonstração e para colocar online rápido.

## Rodar no seu PC (2 comandos)
Requisito: Node.js 18+.
```bash
npm install
npm run dev
```
Abra **http://localhost:3000**. Login: **diego** / **diegoadmin**.

(É só isso — não precisa de banco, nem prisma, nem seed.)

## O que tem
- Site público premium (atrai marcas/clientes).
- Login (diego/diegoadmin) → sistema completo: painel, produção (kanban), ordens, marcas, equipe & bancas, acertos, compras & estoque, financeiro, relatórios com gráficos, automações.
- CMS: edite o site (hero, linhas, galeria, números, contato) e veja na hora em "Ver o site".
- As edições e o login ficam salvos no navegador do dispositivo.

## Publicar online (Vercel)
Opção A — Git (recomendado):
1. Crie um repositório no GitHub e suba esta pasta.
2. Em vercel.com → New Project → importe o repositório → Deploy.
3. Aponte o domínio fermocalcados.com.br.

Opção B — CLI:
```bash
npm i -g vercel
vercel
```
Responda às perguntas (aceite os padrões). Ao final ele dá a URL pública.

Não precisa configurar variáveis de ambiente nesta versão.

## Stack
Next.js 14 + TypeScript + React. Sem banco (estado no navegador). Para uma versão multiusuário com banco real (Postgres/Neon), peça a variante com Prisma.

© 2026 Fermo · Private Label Shoes · Franca/SP

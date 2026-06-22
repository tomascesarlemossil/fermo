// Setup de banco no build (Vercel/CI), resiliente:
// - Se DATABASE_URL e DIRECT_URL existirem, roda `prisma migrate deploy` + seed
//   (idempotente), deixando o banco do Neon pronto no deploy.
// - Se as variáveis não existirem (ou falharem), NÃO quebra o build — apenas
//   registra um aviso. Assim o site publica mesmo antes de o banco ser configurado.
import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

const hasDb = !!process.env.DATABASE_URL && !!process.env.DIRECT_URL;

if (!hasDb) {
  console.warn(
    "\n⚠  DATABASE_URL/DIRECT_URL ausentes — pulando migrate/seed.\n" +
      "   Configure as variáveis na Vercel (Neon) para habilitar login e dados.\n",
  );
  process.exit(0);
}

try {
  console.log("→ prisma migrate deploy");
  run("prisma migrate deploy");
  console.log("→ seed (idempotente)");
  run("tsx prisma/seed.ts");
  console.log("✓ Banco pronto.");
} catch (e) {
  // Não bloqueia o build; o erro fica visível no log para diagnóstico.
  console.error("\n⚠  migrate/seed falhou (build continua):", e?.message ?? e, "\n");
  process.exit(0);
}

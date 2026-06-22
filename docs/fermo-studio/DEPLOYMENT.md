# Deploy — Fermo Studio
- Vercel + Neon (Postgres). Build roda `prisma migrate deploy` + seed idempotente.
- Variáveis: ver `.env.example` (DATABASE_URL, DIRECT_URL, AUTH_SECRET, APP_PUBLIC_URL,
  STORAGE_*, PAYMENT_*, EMAIL_*, WHATSAPP_*, AI_*).
- Assets 3D: em produção, sirva GLBs via storage (S3/Cloudinary). Em dev/demo, `/public/models`.

# Pagamentos — Fermo Studio

Arquitetura preparada para Asaas / Mercado Pago / Stripe (PIX, boleto, cartão).
**Modo sandbox por padrão** (sem gateway): `PAYMENT_PROVIDER=sandbox`.

## Regras
- Nunca confiar no status enviado pelo navegador.
- Webhook valida assinatura (`PAYMENT_WEBHOOK_SECRET`) e é **idempotente** (idempotencyKey).
- Eventos armazenados; conciliação sinal/saldo; retentativas.

## Ativação
1. `PAYMENT_PROVIDER=asaas|mercadopago|stripe`, `PAYMENT_API_KEY=...`, `PAYMENT_WEBHOOK_SECRET=...`.
2. Implementar o adapter em `src/server/studio/payments.ts` (interface já definida).
3. Configurar a URL de webhook `/api/studio/webhooks/payment`.

No sandbox, "Pagar sinal" cria um `Payment` PENDING e um endpoint simula a confirmação
para a demonstração — claramente identificado como DEMO.

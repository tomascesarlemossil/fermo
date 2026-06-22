# Segurança — Fermo Studio
- Auth.js + RBAC por função (cliente, vendedor, designer, técnico, produção, financeiro, admin).
- Multi-tenant: `tenantId` resolvido na sessão (nunca do front); operações fora de contexto falham.
- Validação Zod no cliente **e** no servidor; preço calculado só no servidor.
- Projetos protegidos por dono/tenant; tokens públicos opacos para orçamento.
- Uploads: validar MIME real, tamanho, sanitização, URLs assinadas (com storage).
- Webhooks com segredo + idempotência. Auditoria (`AuditLog`) em escritas sensíveis.
- Custos industriais sensíveis ocultos do cliente (somente breakdown comercial).

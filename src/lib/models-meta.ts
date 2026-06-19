/**
 * Metadados de modelos para as Prisma Extensions.
 * - TENANT_MODELS: modelos de negócio que carregam tenantId e devem ser
 *   filtrados/preenchidos automaticamente.
 * - AUDITED_MODELS: modelos cujas escritas geram AuditLog.
 *
 * Role/Permission/RolePermission são catálogos GLOBAIS (sem tenantId).
 * AuditLog tem tenantId mas NUNCA é auto-filtrado/auditado (evita recursão).
 */

export const TENANT_MODELS = new Set<string>([
  "Company",
  "User",
  "Customer",
  "CustomerContact",
  "Address",
  "Lead",
  "Opportunity",
  "Product",
  "SizeGrid",
  "Material",
  "ProductVariant",
  "TechSheet",
  "TechSheetVersion",
  "BomItem",
  "ConfigRequest",
  "Quote",
  "QuoteVersion",
  "QuoteItem",
  "SalesOrder",
  "SalesOrderItem",
  "ProductionOrder",
  "ProductionStep",
  "ProductionEvent",
  "QualityInspection",
  "QualityDefect",
  "File",
  "Notification",
]);

export const AUDITED_MODELS = new Set<string>([
  "Customer",
  "CustomerContact",
  "Address",
  "Lead",
  "Opportunity",
  "Product",
  "Material",
  "ProductVariant",
  "TechSheetVersion",
  "BomItem",
  "Quote",
  "QuoteVersion",
  "SalesOrder",
  "ProductionOrder",
  "ProductionStep",
  "QualityInspection",
  "User",
]);

export function isTenantModel(model?: string): boolean {
  return !!model && TENANT_MODELS.has(model);
}

export function isAuditedModel(model?: string): boolean {
  return !!model && AUDITED_MODELS.has(model);
}

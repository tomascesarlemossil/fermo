/**
 * RBAC — catálogo de permissões + papéis. Checagem SEMPRE no servidor,
 * por ação: can(session, "quote:approve").
 *
 * Role e Permission são globais (seed). O User aponta para um Role; a sessão
 * carrega o conjunto de permission keys para checagem barata.
 */

export const PERMISSIONS = {
  "lead:read": "Ver leads",
  "lead:write": "Criar/editar leads",
  "customer:read": "Ver clientes",
  "customer:write": "Criar/editar clientes",
  "opportunity:read": "Ver oportunidades",
  "opportunity:write": "Criar/editar oportunidades",
  "quote:read": "Ver orçamentos",
  "quote:write": "Criar/editar orçamentos",
  "quote:send": "Enviar orçamento ao cliente",
  "quote:approve": "Aprovar/recusar orçamento",
  "order:read": "Ver pedidos",
  "order:write": "Criar/editar pedidos",
  "production:read": "Ver ordens de produção",
  "production:write": "Editar ordens de produção e apontar",
  "quality:read": "Ver inspeções de qualidade",
  "quality:write": "Registrar inspeções de qualidade",
  "product:read": "Ver catálogo/produtos",
  "product:write": "Criar/editar produtos, variantes, ficha técnica e BOM",
  "material:read": "Ver materiais",
  "material:write": "Criar/editar materiais",
  "user:read": "Ver usuários",
  "user:write": "Gerenciar usuários",
  "audit:read": "Ver auditoria",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ROLES = {
  admin: {
    name: "Administrador",
    description: "Acesso total à plataforma.",
    permissions: Object.keys(PERMISSIONS) as PermissionKey[],
  },
  comercial: {
    name: "Comercial",
    description: "CRM, orçamentos e pedidos.",
    permissions: [
      "lead:read",
      "lead:write",
      "customer:read",
      "customer:write",
      "opportunity:read",
      "opportunity:write",
      "quote:read",
      "quote:write",
      "quote:send",
      "order:read",
      "order:write",
      "production:read",
      "quality:read",
      "product:read",
      "material:read",
    ] as PermissionKey[],
  },
  producao: {
    name: "Produção",
    description: "Ordens de produção, ficha técnica e chão de fábrica.",
    permissions: [
      "order:read",
      "production:read",
      "production:write",
      "quality:read",
      "quality:write",
      "quote:read",
      "product:read",
      "product:write",
      "material:read",
      "material:write",
    ] as PermissionKey[],
  },
  cliente: {
    name: "Cliente (portal)",
    description: "Acesso ao portal do cliente (aprovação de orçamentos).",
    permissions: ["quote:read", "quote:approve"] as PermissionKey[],
  },
} as const;

export type RoleKey = keyof typeof ROLES;

export type SessionLike = {
  permissions?: string[] | null;
  roleKey?: string | null;
} | null
  | undefined;

export function can(session: SessionLike, permission: PermissionKey): boolean {
  if (!session) return false;
  if (session.roleKey === "admin") return true;
  return !!session.permissions?.includes(permission);
}

export function canAny(session: SessionLike, permissions: PermissionKey[]): boolean {
  return permissions.some((p) => can(session, p));
}

/** Lança erro se a sessão não tiver a permissão. Use em Server Actions/Route Handlers. */
export function assertCan(session: SessionLike, permission: PermissionKey): void {
  if (!can(session, permission)) {
    throw new Error(`Acesso negado: requer permissão '${permission}'.`);
  }
}

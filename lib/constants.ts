// Constants for the application

export const APP_NAME = process.env.APP_NAME || "Farmacia ERP"

export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER", 
  WAREHOUSE: "WAREHOUSE",
  SELLER: "SELLER",
  ACCOUNTANT: "ACCOUNTANT",
  AUDITOR: "AUDITOR",
} as const

export type Role = keyof typeof ROLES

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  WAREHOUSE: "Bodeguero",
  SELLER: "Vendedor",
  ACCOUNTANT: "Contador",
  AUDITOR: "Auditor",
}

export const PERMISSIONS = {
  PRODUCTS: {
    VIEW: "products:view",
    CREATE: "products:create",
    UPDATE: "products:update",
    DELETE: "products:delete",
  },
  SUPPLIERS: {
    VIEW: "suppliers:view",
    CREATE: "suppliers:create",
    UPDATE: "suppliers:update",
    DELETE: "suppliers:delete",
  },
  PURCHASES: {
    VIEW: "purchases:view",
    CREATE: "purchases:create",
    UPDATE: "purchases:update",
    RECEIVE: "purchases:receive",
  },
  INVENTORY: {
    VIEW: "inventory:view",
    ADJUST: "inventory:adjust",
    TRANSFER: "inventory:transfer",
  },
  SALES: {
    VIEW: "sales:view",
    CREATE: "sales:create",
    CANCEL: "sales:cancel",
    REFUND: "sales:refund",
  },
  POS: {
    ACCESS: "pos:access",
    PROCESS_PAYMENT: "pos:process_payment",
  },
  REPORTS: {
    VIEW: "reports:view",
    EXPORT: "reports:export",
  },
  SETTINGS: {
    VIEW: "settings:view",
    MANAGE_USERS: "settings:manage_users",
    MANAGE_BRANCHES: "settings:manage_branches",
    CONFIGURE_DTE: "settings:configure_dte",
  },
} as const

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: Object.values(PERMISSIONS).flatMap(p => Object.values(p)),
  MANAGER: [
    PERMISSIONS.PRODUCTS.VIEW,
    PERMISSIONS.PRODUCTS.CREATE,
    PERMISSIONS.PRODUCTS.UPDATE,
    PERMISSIONS.SUPPLIERS.VIEW,
    PERMISSIONS.SUPPLIERS.CREATE,
    PERMISSIONS.SUPPLIERS.UPDATE,
    PERMISSIONS.PURCHASES.VIEW,
    PERMISSIONS.PURCHASES.CREATE,
    PERMISSIONS.PURCHASES.RECEIVE,
    PERMISSIONS.INVENTORY.VIEW,
    PERMISSIONS.INVENTORY.ADJUST,
    PERMISSIONS.INVENTORY.TRANSFER,
    PERMISSIONS.SALES.VIEW,
    PERMISSIONS.SALES.CANCEL,
    PERMISSIONS.POS.ACCESS,
    PERMISSIONS.POS.PROCESS_PAYMENT,
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.REPORTS.EXPORT,
    PERMISSIONS.SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.MANAGE_USERS,
    PERMISSIONS.SETTINGS.MANAGE_BRANCHES,
  ],
  WAREHOUSE: [
    PERMISSIONS.PRODUCTS.VIEW,
    PERMISSIONS.PURCHASES.VIEW,
    PERMISSIONS.PURCHASES.RECEIVE,
    PERMISSIONS.INVENTORY.VIEW,
    PERMISSIONS.INVENTORY.ADJUST,
    PERMISSIONS.INVENTORY.TRANSFER,
  ],
  SELLER: [
    PERMISSIONS.PRODUCTS.VIEW,
    PERMISSIONS.INVENTORY.VIEW,
    PERMISSIONS.SALES.VIEW,
    PERMISSIONS.POS.ACCESS,
    PERMISSIONS.POS.PROCESS_PAYMENT,
  ],
  ACCOUNTANT: [
    PERMISSIONS.PRODUCTS.VIEW,
    PERMISSIONS.SUPPLIERS.VIEW,
    PERMISSIONS.PURCHASES.VIEW,
    PERMISSIONS.SALES.VIEW,
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.REPORTS.EXPORT,
    PERMISSIONS.SETTINGS.VIEW,
    PERMISSIONS.SETTINGS.CONFIGURE_DTE,
  ],
  AUDITOR: [
    PERMISSIONS.PRODUCTS.VIEW,
    PERMISSIONS.SUPPLIERS.VIEW,
    PERMISSIONS.PURCHASES.VIEW,
    PERMISSIONS.INVENTORY.VIEW,
    PERMISSIONS.SALES.VIEW,
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.SETTINGS.VIEW,
  ],
}
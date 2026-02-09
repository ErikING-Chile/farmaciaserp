import { UserRole, MovementType, PurchaseStatus, SaleStatus, PaymentMethod, PaymentStatus, DteStatus, AlertType, AlertSeverity, WarehouseType, TaxCategory, TenantStatus, SupplierStatus, AlertRuleType } from "@prisma/client"

// Re-export enums
export {
  UserRole,
  MovementType,
  PurchaseStatus,
  SaleStatus,
  PaymentMethod,
  PaymentStatus,
  DteStatus,
  AlertType,
  AlertSeverity,
  WarehouseType,
  TaxCategory,
  TenantStatus,
  SupplierStatus,
  AlertRuleType,
}

// Auth Types
export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  tenantId: string
  branchId: string | null
  image?: string | null
}

export interface AuthResult {
  success: boolean
  error?: string
  user?: SessionUser
}

// Product Types
export interface ProductWithStock extends Product {
  currentStock: number
  batches: BatchInfo[]
}

export interface Product {
  id: string
  sku: string
  name: string
  brand: string | null
  description: string | null
  unit: string
  taxCategory: TaxCategory
  isActive: boolean
  barcode: string | null
  supplierCode: string | null
  minStock: number
  maxStock: number | null
  reorderPoint: number
  baseCost: number
  salePrice: number
  categoryId: string | null
  category: Category | null
  tenantId: string
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  name: string
  description: string | null
}

export interface BatchInfo {
  id: string
  lotNumber: string
  expirationDate: Date
  remainingQty: number
  unitCost: number
}

// Inventory Types
export interface StockLevel {
  productId: string
  productName: string
  sku: string
  branchId: string
  warehouseId: string
  totalQuantity: number
  batches: BatchStock[]
}

export interface BatchStock {
  batchId: string
  lotNumber: string
  expirationDate: Date
  quantity: number
  unitCost: number
}

// Sale Types
export interface CartItem {
  productId: string
  name: string
  sku: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  total: number
  allocations?: BatchAllocation[]
}

export interface BatchAllocation {
  batchId: string
  lotNumber: string
  quantity: number
  expirationDate: Date
}

export interface PaymentInfo {
  method: PaymentMethod
  provider?: string
  amount: number
  reference?: string
}

// Sync Types
export interface SyncOperation {
  id: string
  type: "SALE" | "STOCK_MOVEMENT" | "PRODUCT_UPDATE"
  payload: unknown
  timestamp: string
  idempotencyKey: string
  status: "PENDING" | "SYNCED" | "ERROR"
}

export interface SyncPullResult {
  operations: SyncOperation[]
  cursor: string
  hasMore: boolean
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

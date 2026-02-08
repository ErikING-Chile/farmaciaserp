import { z } from "zod"

// Product schemas
export const productSchema = z.object({
  sku: z.string().min(1, "SKU es requerido"),
  name: z.string().min(1, "Nombre es requerido"),
  brand: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().default("UN"),
  taxCategory: z.enum(["EXEMPT", "STANDARD", "REDUCED"]).default("STANDARD"),
  barcode: z.string().optional(),
  supplierCode: z.string().optional(),
  minStock: z.number().min(0).default(0),
  maxStock: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).default(10),
  baseCost: z.number().min(0).default(0),
  salePrice: z.number().min(0).default(0),
  categoryId: z.string().optional(),
})

export type ProductInput = z.infer<typeof productSchema>

// Sale schemas
export const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
})

export const paymentSchema = z.object({
  method: z.enum(["CASH", "CARD_DEBIT", "CARD_CREDIT", "TRANSFER", "ONLINE"]),
  provider: z.enum(["TRANSBANK", "OTHER"]).default("OTHER"),
  amount: z.number().min(0),
  reference: z.string().optional(),
})

export const saleSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Debe agregar al menos un producto"),
  payments: z.array(paymentSchema).min(1, "Debe registrar al menos un pago"),
  customerId: z.string().optional(),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
})

export type SaleInput = z.infer<typeof saleSchema>

// Purchase schemas
export const purchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  unitCost: z.number().min(0),
  discount: z.number().min(0).default(0),
  batchLotNumber: z.string().optional(),
  expirationDate: z.string().datetime().optional(),
})

export const purchaseSchema = z.object({
  supplierId: z.string(),
  invoiceNumber: z.string().min(1, "Número de factura requerido"),
  invoiceDate: z.string().datetime(),
  items: z.array(purchaseItemSchema).min(1),
  dteType: z.string().optional(),
  dteFolio: z.string().optional(),
})

export type PurchaseInput = z.infer<typeof purchaseSchema>

// Receiving schemas
export const receivingItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(0),
  batchLotNumber: z.string(),
  expirationDate: z.string().datetime(),
  notes: z.string().optional(),
})

export const receivingSchema = z.object({
  invoiceId: z.string(),
  items: z.array(receivingItemSchema).min(1),
  notes: z.string().optional(),
})

export type ReceivingInput = z.infer<typeof receivingSchema>

// Sync schemas
export const syncOperationSchema = z.object({
  id: z.string(),
  type: z.enum(["SALE", "STOCK_MOVEMENT", "PRODUCT_UPDATE"]),
  payload: z.unknown(),
  timestamp: z.string().datetime(),
  idempotencyKey: z.string(),
})

export const syncPushSchema = z.object({
  operations: z.array(syncOperationSchema),
  deviceId: z.string(),
})

export type SyncPushInput = z.infer<typeof syncPushSchema>
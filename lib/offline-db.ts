import Dexie, { Table } from "dexie"
import { SyncOperation } from "@/types"

export interface OfflineProduct {
  id: string
  sku: string
  name: string
  brand: string | null
  salePrice: number
  taxRate: number
  barcode: string | null
  batches: {
    id: string
    lotNumber: string
    expirationDate: string
    remainingQty: number
  }[]
  lastSync: Date
}

export interface OfflineSale {
  id: string
  items: {
    productId: string
    name: string
    quantity: number
    unitPrice: number
    allocations: {
      batchId: string
      quantity: number
    }[]
  }[]
  total: number
  paymentMethod: string
  reference?: string
  createdAt: Date
  syncStatus: "pending" | "synced" | "error"
  syncId: string
}

class OfflineDatabase extends Dexie {
  products!: Table<OfflineProduct>
  sales!: Table<OfflineSale>
  syncQueue!: Table<SyncOperation>
  meta!: Table<{ key: string; value: any }>

  constructor() {
    super("FarmaciaERP")
    
    this.version(1).stores({
      products: "id, sku, barcode, lastSync",
      sales: "id, syncStatus, createdAt, syncId",
      syncQueue: "id, type, timestamp, status",
      meta: "key",
    })
  }
}

export const db = new OfflineDatabase()

// Sync operations
export async function syncProducts(tenantId: string, branchId: string | null): Promise<void> {
  try {
    const lastSync = await db.meta.get("lastProductSync")
    const since = lastSync?.value || new Date(0).toISOString()

    const response = await fetch(
      `/api/sync/pull?type=products&tenantId=${tenantId}&since=${encodeURIComponent(since)}${branchId ? `&branchId=${branchId}` : ""}`
    )

    if (!response.ok) {
      throw new Error("Failed to fetch products")
    }

    const { products, timestamp } = await response.json()

    // Update local database
    await db.transaction("rw", db.products, async () => {
      for (const product of products) {
        await db.products.put({
          ...product,
          lastSync: new Date(),
        })
      }
    })

    // Update last sync timestamp
    await db.meta.put({ key: "lastProductSync", value: timestamp })

  } catch (error) {
    console.error("Error syncing products:", error)
    throw error
  }
}

export async function queueSale(sale: Omit<OfflineSale, "id" | "syncStatus">): Promise<string> {
  const id = crypto.randomUUID()
  const syncId = crypto.randomUUID()
  
  await db.sales.add({
    ...sale,
    id,
    syncStatus: "pending",
    syncId,
  })

  return id
}

export async function syncPendingSales(): Promise<{ success: number; errors: number }> {
  const pendingSales = await db.sales.where("syncStatus").equals("pending").toArray()
  
  let success = 0
  let errors = 0

  for (const sale of pendingSales) {
    try {
      const response = await fetch("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: sale.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: 0,
            allocations: item.allocations,
          })),
          payments: [{
            method: sale.paymentMethod,
            amount: sale.total,
            reference: sale.reference,
          }],
          idempotencyKey: sale.syncId,
        }),
      })

      if (response.ok) {
        await db.sales.update(sale.id, { syncStatus: "synced" })
        success++
      } else {
        const error = await response.json()
        console.error("Sync error for sale", sale.id, error)
        await db.sales.update(sale.id, { syncStatus: "error" })
        errors++
      }
    } catch (error) {
      console.error("Network error syncing sale", sale.id, error)
      errors++
    }
  }

  return { success, errors }
}

export async function getOfflineProducts(search?: string): Promise<OfflineProduct[]> {
  if (!search) {
    return db.products.toArray()
  }

  const lowerSearch = search.toLowerCase()
  return db.products
    .filter((p) =>
      p.name.toLowerCase().includes(lowerSearch) ||
      p.sku.toLowerCase().includes(lowerSearch) ||
      p.barcode?.includes(search)
    )
    .toArray()
}

export async function getOfflineProductByBarcode(barcode: string): Promise<OfflineProduct | undefined> {
  return db.products.where("barcode").equals(barcode).first()
}

// Check online status
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true
}

// Sync status
export async function getSyncStatus() {
  const pendingCount = await db.sales.where("syncStatus").equals("pending").count()
  const errorCount = await db.sales.where("syncStatus").equals("error").count()
  const lastSync = await db.meta.get("lastProductSync")

  return {
    pendingSales: pendingCount,
    errorSales: errorCount,
    lastSync: lastSync?.value,
    isOnline: isOnline(),
  }
}
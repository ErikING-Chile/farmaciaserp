import { PaymentMethod, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

const DEFAULT_TAX_RATE = 19

export interface PosSaleItemInput {
  productId: string
  quantity: number
  unitPrice: number
  discount?: number
}

export interface PosSalePaymentInput {
  method: PaymentMethod
  amount: number
  reference?: string
}

export interface CreatePosSaleInput {
  tenantId: string
  userId: string
  branchId?: string | null
  customerId?: string
  idempotencyKey?: string
  items: PosSaleItemInput[]
  payments: PosSalePaymentInput[]
}

export interface FefoAllocation {
  batchId: string
  quantity: number
  lotNumber: string
}

export interface FefoBatch {
  id: string
  lotNumber: string
  expirationDate: Date
  remainingQty: number
}

export class PosSaleError extends Error {
  code: string
  status: number
  details?: Record<string, unknown>

  constructor(
    message: string,
    options: { code: string; status: number; details?: Record<string, unknown> }
  ) {
    super(message)
    this.code = options.code
    this.status = options.status
    this.details = options.details
  }
}

export function allocateBatchesFefo(batches: FefoBatch[], quantity: number) {
  const allocations: FefoAllocation[] = []
  let remaining = quantity

  if (quantity <= 0) {
    return { allocations, remaining: 0 }
  }

  const sorted = [...batches]
    .filter((batch) => batch.remainingQty > 0)
    .sort((a, b) => {
      const expirationDiff = a.expirationDate.getTime() - b.expirationDate.getTime()
      if (expirationDiff !== 0) {
        return expirationDiff
      }
      return a.id.localeCompare(b.id)
    })

  for (const batch of sorted) {
    if (remaining <= 0) {
      break
    }

    const allocateQty = Math.min(remaining, batch.remainingQty)

    allocations.push({
      batchId: batch.id,
      quantity: allocateQty,
      lotNumber: batch.lotNumber,
    })

    remaining -= allocateQty
  }

  return { allocations, remaining }
}

async function resolveBranchAndWarehouse(
  tx: Prisma.TransactionClient,
  tenantId: string,
  requestedBranchId?: string | null
) {
  const branchId =
    requestedBranchId ||
    (
      await tx.branch.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
      })
    )?.id

  if (!branchId) {
    throw new PosSaleError("No branch found", {
      code: "BRANCH_NOT_FOUND",
      status: 400,
    })
  }

  const warehouse =
    (
      await tx.warehouse.findFirst({
        where: {
          tenantId,
          isDefault: true,
          OR: [{ branchId }, { branchId: null }],
        },
        orderBy: [{ branchId: "desc" }, { createdAt: "asc" }],
      })
    ) ||
    (
      await tx.warehouse.findFirst({
        where: {
          tenantId,
          OR: [{ branchId }, { branchId: null }],
        },
        orderBy: [{ branchId: "desc" }, { createdAt: "asc" }],
      })
    )

  if (!warehouse) {
    throw new PosSaleError("No warehouse found", {
      code: "WAREHOUSE_NOT_FOUND",
      status: 400,
    })
  }

  return { branchId, warehouse }
}

export async function createPosSale(input: CreatePosSaleInput) {
  return prisma.$transaction(async (tx) => {
    const { branchId, warehouse } = await resolveBranchAndWarehouse(
      tx,
      input.tenantId,
      input.branchId
    )

    const lastSale = await tx.sale.findFirst({
      where: { tenantId: input.tenantId },
      orderBy: { saleNumber: "desc" },
    })

    const saleNumber = lastSale
      ? String(parseInt(lastSale.saleNumber) + 1).padStart(8, "0")
      : "00000001"

    let subtotal = 0
    let taxAmount = 0

    const allocationsByProduct = new Map<string, FefoAllocation[]>()

    for (const item of input.items) {
      const discount = item.discount ?? 0
      const itemNet = item.quantity * item.unitPrice * (1 - discount / 100)
      subtotal += itemNet
      taxAmount += itemNet * (DEFAULT_TAX_RATE / 100)

      const batches = await tx.batch.findMany({
        where: {
          tenantId: input.tenantId,
          branchId,
          warehouseId: warehouse.id,
          productId: item.productId,
          isActive: true,
          remainingQty: { gt: 0 },
        },
        select: {
          id: true,
          lotNumber: true,
          expirationDate: true,
          remainingQty: true,
        },
        orderBy: [{ expirationDate: "asc" }, { createdAt: "asc" }],
      })

      const { allocations, remaining } = allocateBatchesFefo(batches, item.quantity)

      if (remaining > 0) {
        const available = item.quantity - remaining
        throw new PosSaleError("Insufficient stock for product", {
          code: "INSUFFICIENT_STOCK",
          status: 409,
          details: {
            productId: item.productId,
            requested: item.quantity,
            available,
          },
        })
      }

      allocationsByProduct.set(item.productId, allocations)
    }

    const total = subtotal + taxAmount
    const totalPayments = input.payments.reduce((sum, payment) => sum + payment.amount, 0)

    if (Math.abs(totalPayments - total) > 0.01) {
      throw new PosSaleError("Payment amount doesn't match total", {
        code: "PAYMENT_MISMATCH",
        status: 400,
      })
    }

    const sale = await tx.sale.create({
      data: {
        saleNumber,
        tenantId: input.tenantId,
        branchId,
        warehouseId: warehouse.id,
        sellerId: input.userId,
        customerId: input.customerId,
        subtotal,
        taxAmount,
        total,
        status: "PAID",
        syncId: input.idempotencyKey,
        items: {
          create: input.items.map((item) => {
            const discount = item.discount ?? 0
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount,
              taxRate: DEFAULT_TAX_RATE,
              total:
                item.quantity * item.unitPrice * (1 - discount / 100) *
                (1 + DEFAULT_TAX_RATE / 100),
              allocations: {
                create: (allocationsByProduct.get(item.productId) || []).map((alloc) => ({
                  batchId: alloc.batchId,
                  quantity: alloc.quantity,
                })),
              },
            }
          }),
        },
        payments: {
          create: input.payments.map((payment) => ({
            method: payment.method,
            amount: payment.amount,
            reference: payment.reference,
            status: "COMPLETED",
          })),
        },
      } as Prisma.SaleUncheckedCreateInput,
    })

    for (const item of input.items) {
      const allocations = allocationsByProduct.get(item.productId) || []

      for (const allocation of allocations) {
        const updated = await tx.batch.updateMany({
          where: {
            id: allocation.batchId,
            tenantId: input.tenantId,
            branchId,
            warehouseId: warehouse.id,
            remainingQty: { gte: allocation.quantity },
          },
          data: {
            remainingQty: {
              decrement: allocation.quantity,
            },
          },
        })

        if (updated.count !== 1) {
          throw new PosSaleError("Stock changed during sale processing", {
            code: "STOCK_CONFLICT",
            status: 409,
            details: {
              batchId: allocation.batchId,
              requested: allocation.quantity,
            },
          })
        }

        await tx.stockMovement.create({
          data: {
            type: "SALE",
            quantity: allocation.quantity,
            qtyIn: 0,
            qtyOut: allocation.quantity,
            tenantId: input.tenantId,
            branchId,
            warehouseId: warehouse.id,
            productId: item.productId,
            batchId: allocation.batchId,
            refType: "SALE",
            refId: sale.id,
            createdBy: input.userId,
          },
        })
      }
    }

    await tx.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "Sale",
        entityId: sale.id,
        tenantId: input.tenantId,
        userId: input.userId,
        newValues: sale,
      },
    })

    return sale
  })
}

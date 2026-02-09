import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { generateIdempotencyKey } from "@/lib/utils"

const allocationSchema = z.object({
  batchId: z.string(),
  quantity: z.number().min(1),
  lotNumber: z.string(),
})

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  allocations: z.array(allocationSchema),
})

const paymentSchema = z.object({
  method: z.enum(["CASH", "CARD_DEBIT", "CARD_CREDIT", "TRANSFER", "ONLINE"]),
  amount: z.number().min(0),
  reference: z.string().optional(),
})

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSchema).min(1),
  customerId: z.string().optional(),
  idempotencyKey: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = saleSchema.parse(body)

    const idempotencyKey = data.idempotencyKey || generateIdempotencyKey()

    // Check for existing sale with this idempotency key
    const existingSale = await prisma.sale.findUnique({
      where: { syncId: idempotencyKey },
    })

    if (existingSale) {
      return NextResponse.json({
        success: true,
        saleId: existingSale.id,
        saleNumber: existingSale.saleNumber,
        message: "Sale already processed",
      })
    }

    // Validate and process sale
    const result = await prisma.$transaction(async (tx) => {
      // Generate sale number
      const lastSale = await tx.sale.findFirst({
        where: { tenantId: session.user.tenantId },
        orderBy: { saleNumber: "desc" },
      })
      
      const saleNumber = lastSale 
        ? String(parseInt(lastSale.saleNumber) + 1).padStart(8, "0")
        : "00000001"

      // Calculate totals
      let subtotal = 0
      let taxAmount = 0

      for (const item of data.items) {
        const itemTotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
        subtotal += itemTotal
        taxAmount += itemTotal * 0.19 // Assuming 19% IVA for now
      }

      const total = subtotal + taxAmount

      // Validate payments cover total
      const totalPayments = data.payments.reduce((sum, p) => sum + p.amount, 0)
      if (Math.abs(totalPayments - total) > 0.01) {
        throw new Error("Payment amount doesn't match total")
      }

      // Create sale
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          tenantId: session.user.tenantId,
          branchId: session.user.branchId || (await tx.branch.findFirst({
            where: { tenantId: session.user.tenantId },
          }))?.id || "",
          sellerId: session.user.id,
          customerId: data.customerId,
          subtotal,
          taxAmount,
          total,
          status: "PAID",
          syncId: idempotencyKey,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              taxRate: 19,
              total: item.quantity * item.unitPrice * (1 - item.discount / 100) * 1.19,
              allocations: {
                create: item.allocations.map((alloc) => ({
                  batchId: alloc.batchId,
                  quantity: alloc.quantity,
                })),
              },
            })),
          },
          payments: {
            create: data.payments.map((payment) => ({
              method: payment.method,
              amount: payment.amount,
              reference: payment.reference,
              status: "COMPLETED",
            })),
          },
        },
      })

      // Create stock movements (OUT) for each allocation
      const defaultWarehouse =
        (await tx.warehouse.findFirst({
          where: { tenantId: session.user.tenantId, isDefault: true },
        })) ||
        (await tx.warehouse.findFirst({
          where: { tenantId: session.user.tenantId },
        }))

      if (!defaultWarehouse) {
        throw new Error("No warehouse found")
      }

      for (const item of data.items) {
        for (const alloc of item.allocations) {
          // Update batch remaining quantity
          await tx.batch.update({
            where: { id: alloc.batchId },
            data: {
              remainingQty: {
                decrement: alloc.quantity,
              },
            },
          })

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              type: "SALE",
              quantity: alloc.quantity,
              qtyIn: 0,
              qtyOut: alloc.quantity,
              tenantId: session.user.tenantId,
              branchId: sale.branchId,
              warehouseId: defaultWarehouse.id,
              productId: item.productId,
              batchId: alloc.batchId,
              refType: "SALE",
              refId: sale.id,
              createdBy: session.user.id,
              syncId: generateIdempotencyKey(),
            },
          })
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "Sale",
          entityId: sale.id,
          tenantId: session.user.tenantId,
          userId: session.user.id,
          newValues: sale,
        },
      })

      return sale
    })

    return NextResponse.json({
      success: true,
      saleId: result.id,
      saleNumber: result.saleNumber,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }
    
    console.error("Error processing sale:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process sale" },
      { status: 500 }
    )
  }
}

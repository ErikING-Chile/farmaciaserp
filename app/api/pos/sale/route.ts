import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { generateIdempotencyKey } from "@/lib/utils"
import { createPosSale, PosSaleError } from "@/lib/pos-sales"

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
  allocations: z.array(allocationSchema).optional(),
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

    const result = await createPosSale({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      branchId: session.user.branchId,
      customerId: data.customerId,
      idempotencyKey,
      items: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      })),
      payments: data.payments,
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

    if (error instanceof PosSaleError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.status }
      )
    }
    
    console.error("Error processing sale:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process sale" },
      { status: 500 }
    )
  }
}

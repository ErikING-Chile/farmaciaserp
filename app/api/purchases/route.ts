import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Prisma, PurchaseStatus } from "@prisma/client"

const querySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = querySchema.parse(Object.fromEntries(searchParams))

    const where: Prisma.PurchaseInvoiceWhereInput = {
      tenantId: session.user.tenantId,
    }

    if (params.search) {
      where.OR = [
        { invoiceNumber: { contains: params.search, mode: "insensitive" } },
        { supplier: { name: { contains: params.search, mode: "insensitive" } } },
      ]
    }

    if (params.status && params.status !== "all") {
      const normalizedStatus = params.status.toUpperCase()
      if (normalizedStatus in PurchaseStatus) {
        where.status = normalizedStatus as PurchaseStatus
      }
    }

    const skip = (params.page - 1) * params.limit

    const [purchases, total] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where,
        include: {
          supplier: true,
          items: {
            include: {
              product: {
                select: { name: true, sku: true },
              },
            },
          },
          receivings: {
            include: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: params.limit,
      }),
      prisma.purchaseInvoice.count({ where }),
    ])

    return NextResponse.json({
      data: purchases,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    })
  } catch (error) {
    console.error("Error fetching purchases:", error)
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    )
  }
}

const purchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  unitCost: z.number().min(0),
  discount: z.number().min(0).default(0),
  batchLotNumber: z.string().optional(),
  expirationDate: z.string().optional(),
})

const createPurchaseSchema = z.object({
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string(),
  supplierId: z.string(),
  items: z.array(purchaseItemSchema).min(1),
  netAmount: z.number().min(0),
  taxAmount: z.number().min(0),
  totalAmount: z.number().min(0),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = createPurchaseSchema.parse(body)

    // Check for duplicate invoice number
    const existing = await prisma.purchaseInvoice.findFirst({
      where: {
        tenantId: session.user.tenantId,
        invoiceNumber: data.invoiceNumber,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Invoice number already exists" },
        { status: 409 }
      )
    }

    const purchase = await prisma.$transaction(async (tx) => {
      // Create purchase invoice
      const invoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          invoiceDate: new Date(data.invoiceDate),
          netAmount: data.netAmount,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount,
          status: "DRAFT",
          tenantId: session.user.tenantId,
          supplierId: data.supplierId,
          items: {
            create: data.items.map((item) => ({
              quantity: item.quantity,
              unitCost: item.unitCost,
              discount: item.discount,
              total: item.quantity * item.unitCost * (1 - item.discount / 100),
              batchLotNumber: item.batchLotNumber,
              expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
              productId: item.productId,
              tenantId: session.user.tenantId,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
        },
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: "CREATE",
          entityType: "PurchaseInvoice",
          entityId: invoice.id,
          tenantId: session.user.tenantId,
          userId: session.user.id,
          newValues: invoice,
        },
      })

      return invoice
    })

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error creating purchase:", error)
    return NextResponse.json(
      { error: "Failed to create purchase" },
      { status: 500 }
    )
  }
}

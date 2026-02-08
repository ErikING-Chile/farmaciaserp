import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const querySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  includeStock: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = querySchema.parse(Object.fromEntries(searchParams))

    const where = {
      tenantId: session.user.tenantId,
      isActive: true,
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: "insensitive" as const } },
          { sku: { contains: params.search, mode: "insensitive" as const } },
          { barcode: { contains: params.search, mode: "insensitive" as const } },
        ],
      }),
      ...(params.category && { categoryId: params.category }),
    }

    const skip = (params.page - 1) * params.limit

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          batches: params.includeStock ? {
            where: {
              remainingQty: { gt: 0 },
              expirationDate: { gte: new Date() },
            },
            orderBy: { expirationDate: "asc" },
          } : false,
        },
        orderBy: { name: "asc" },
        skip,
        take: params.limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      data: products,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().default("UN"),
  taxCategory: z.enum(["EXEMPT", "STANDARD", "REDUCED"]).default("STANDARD"),
  barcode: z.string().optional(),
  supplierCode: z.string().optional(),
  minStock: z.number().default(0),
  maxStock: z.number().optional(),
  reorderPoint: z.number().default(10),
  baseCost: z.number().default(0),
  salePrice: z.number().default(0),
  categoryId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const data = createProductSchema.parse(body)

    // Check for duplicate SKU
    const existing = await prisma.product.findFirst({
      where: {
        tenantId: session.user.tenantId,
        sku: data.sku,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "SKU already exists" },
        { status: 409 }
      )
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        tenantId: session.user.tenantId,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "CREATE",
        entityType: "Product",
        entityId: product.id,
        tenantId: session.user.tenantId,
        userId: session.user.id,
        newValues: product,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error creating product:", error)
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    )
  }
}

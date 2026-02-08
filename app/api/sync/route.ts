import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/sync/pull?type=products&since=timestamp
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const since = searchParams.get("since")
    const tenantId = session.user.tenantId
    const branchId = session.user.branchId

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 })
    }

    const sinceDate = since ? new Date(since) : new Date(0)
    const now = new Date()

    let data: unknown[] = []

    switch (type) {
      case "products":
        data = await prisma.product.findMany({
          where: {
            tenantId,
            isActive: true,
            updatedAt: { gte: sinceDate },
          },
          include: {
            category: true,
            batches: {
              where: {
                remainingQty: { gt: 0 },
              },
              orderBy: { expirationDate: "asc" },
            },
          },
        })
        break

      case "sales":
        data = await prisma.sale.findMany({
          where: {
            tenantId,
            updatedAt: { gte: sinceDate },
            ...(branchId && { branchId }),
          },
          include: {
            items: {
              include: {
                allocations: true,
              },
            },
            payments: true,
          },
        })
        break

      case "stock":
        data = await prisma.stockMovement.findMany({
          where: {
            tenantId,
            createdAt: { gte: sinceDate },
            ...(branchId && { branchId }),
          },
          include: {
            product: true,
            batch: true,
          },
        })
        break

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    return NextResponse.json({
      data,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Sync pull error:", error)
    return NextResponse.json(
      { error: "Failed to fetch sync data" },
      { status: 500 }
    )
  }
}

// POST /api/sync/push - Push offline operations
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { operations } = body

    const results = []

    for (const operation of operations) {
      try {
        // Check idempotency
        const existing = await prisma.sale.findUnique({
          where: { syncId: operation.idempotencyKey },
        })

        if (existing) {
          results.push({
            id: operation.id,
            status: "already_processed",
            saleId: existing.id,
          })
          continue
        }

        // Process based on type
        switch (operation.type) {
          case "SALE":
            const saleData = operation.payload
            // Reuse the POS sale logic
            const response = await fetch(`${process.env.NEXTAUTH_URL}/api/pos/sale`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Cookie": request.headers.get("cookie") || "",
              },
              body: JSON.stringify({
                ...saleData,
                idempotencyKey: operation.idempotencyKey,
              }),
            })

            if (response.ok) {
              const result = await response.json()
              results.push({
                id: operation.id,
                status: "success",
                saleId: result.saleId,
              })
            } else {
              const error = await response.json()
              results.push({
                id: operation.id,
                status: "error",
                error: error.message || "Failed to process sale",
              })
            }
            break

          default:
            results.push({
              id: operation.id,
              status: "error",
              error: "Unknown operation type",
            })
        }
      } catch (error) {
        results.push({
          id: operation.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      processedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Sync push error:", error)
    return NextResponse.json(
      { error: "Failed to process sync operations" },
      { status: 500 }
    )
  }
}

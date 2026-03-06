import { beforeEach, describe, expect, it, vi } from "vitest"

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}))

import { createPosSale, PosSaleError } from "@/lib/pos-sales"

describe("createPosSale", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allocates stock by FEFO on server and persists movements", async () => {
    const tx = {
      branch: { findFirst: vi.fn() },
      warehouse: {
        findFirst: vi.fn().mockResolvedValue({ id: "wh-1" }),
      },
      sale: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "sale-1",
          saleNumber: "00000001",
        }),
      },
      batch: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "batch-late",
            lotNumber: "LATE",
            expirationDate: new Date("2026-12-31"),
            remainingQty: 10,
          },
          {
            id: "batch-early",
            lotNumber: "EARLY",
            expirationDate: new Date("2026-05-01"),
            remainingQty: 4,
          },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      stockMovement: {
        create: vi.fn().mockResolvedValue({ id: "sm-1" }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-1" }),
      },
    }

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof tx) => unknown) => callback(tx)
    )

    await createPosSale({
      tenantId: "tenant-1",
      userId: "user-1",
      branchId: "branch-1",
      idempotencyKey: "idem-1",
      items: [
        {
          productId: "product-1",
          quantity: 6,
          unitPrice: 1500,
          discount: 0,
        },
      ],
      payments: [
        {
          method: "CASH",
          amount: 10710,
        },
      ],
    })

    expect(tx.sale.create).toHaveBeenCalledTimes(1)

    const saleCreateInput = tx.sale.create.mock.calls[0][0].data
    const allocations = saleCreateInput.items.create[0].allocations.create

    expect(allocations).toEqual([
      { batchId: "batch-early", quantity: 4 },
      { batchId: "batch-late", quantity: 2 },
    ])

    expect(tx.batch.updateMany).toHaveBeenCalledTimes(2)
    expect(tx.stockMovement.create).toHaveBeenCalledTimes(2)
  })

  it("throws INSUFFICIENT_STOCK when FEFO batches cannot satisfy quantity", async () => {
    const tx = {
      branch: { findFirst: vi.fn() },
      warehouse: {
        findFirst: vi.fn().mockResolvedValue({ id: "wh-1" }),
      },
      sale: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      batch: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "batch-1",
            lotNumber: "ONLY",
            expirationDate: new Date("2026-05-01"),
            remainingQty: 1,
          },
        ]),
        updateMany: vi.fn(),
      },
      stockMovement: {
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    }

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      createPosSale({
        tenantId: "tenant-1",
        userId: "user-1",
        branchId: "branch-1",
        idempotencyKey: "idem-2",
        items: [
          {
            productId: "product-1",
            quantity: 2,
            unitPrice: 1500,
            discount: 0,
          },
        ],
        payments: [
          {
            method: "CASH",
            amount: 3570,
          },
        ],
      })
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    } satisfies Partial<PosSaleError>)

    expect(tx.sale.create).not.toHaveBeenCalled()
  })
})

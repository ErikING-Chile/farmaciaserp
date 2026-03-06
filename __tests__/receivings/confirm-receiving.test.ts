import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "@/lib/prisma"
import { confirmReceiving } from "@/lib/receivings"

const runDbTests = process.env.RUN_DB_TESTS === "true"
const describeDb = runDbTests ? describe : describe.skip

describeDb("confirmReceiving", () => {
  let tenantId = ""
  let branchId = ""
  let warehouseId = ""
  let supplierId = ""
  let productId = ""
  let receivingId = ""
  let userId = ""

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Tenant",
        slug: `test-tenant-${Date.now()}`,
      },
    })
    tenantId = tenant.id

    const branch = await prisma.branch.create({
      data: {
        name: "Test Branch",
        tenantId,
      },
    })
    branchId = branch.id

    const warehouse = await prisma.warehouse.create({
      data: {
        name: "Test Warehouse",
        type: "MAIN",
        tenantId,
        branchId,
      },
    })
    warehouseId = warehouse.id

    const user = await prisma.user.create({
      data: {
        email: `user-${Date.now()}@test.cl`,
        name: "Tester",
        password: "hashed",
        role: "ADMIN",
        tenantId,
        branchId,
      },
    })
    userId = user.id

    const supplier = await prisma.supplier.create({
      data: {
        name: "Proveedor Test",
        tenantId,
        status: "ACTIVE",
      },
    })
    supplierId = supplier.id

    const product = await prisma.product.create({
      data: {
        sku: `SKU-${Date.now()}`,
        name: "Producto Test",
        unit: "UN",
        taxCategory: "STANDARD",
        baseCost: 1000,
        salePrice: 1500,
        tenantId,
      },
    })
    productId = product.id

    const receiving = await prisma.receiving.create({
      data: {
        tenantId,
        branchId,
        warehouseId,
        supplierId,
        status: "DRAFT",
        items: {
          create: [
            {
              productId,
              quantity: 5,
              unitCost: 1200,
              batchLotNumber: "LOT-1",
              expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
              tenantId,
            },
            {
              productId,
              quantity: 3,
              unitCost: 1100,
              batchLotNumber: "LOT-2",
              expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              tenantId,
            },
          ],
        },
      },
    })
    receivingId = receiving.id
  })

  afterAll(async () => {
    await prisma.stockMovement.deleteMany({ where: { tenantId } })
    await prisma.batch.deleteMany({ where: { tenantId } })
    await prisma.receivingItem.deleteMany({ where: { tenantId } })
    await prisma.receiving.deleteMany({ where: { tenantId } })
    await prisma.product.deleteMany({ where: { tenantId } })
    await prisma.supplier.deleteMany({ where: { tenantId } })
    await prisma.user.deleteMany({ where: { tenantId } })
    await prisma.warehouse.deleteMany({ where: { tenantId } })
    await prisma.branch.deleteMany({ where: { tenantId } })
    await prisma.tenant.deleteMany({ where: { id: tenantId } })
  })

  it("creates inventory lots and movements on confirm", async () => {
    await confirmReceiving({ receivingId, tenantId, userId })

    const updatedReceiving = await prisma.receiving.findFirst({
      where: { id: receivingId, tenantId },
    })

    expect(updatedReceiving?.status).toBe("RECEIVED")

    const batches = await prisma.batch.findMany({
      where: { tenantId, productId },
    })

    expect(batches.length).toBe(2)

    const movements = await prisma.stockMovement.findMany({
      where: { tenantId, refId: receivingId, refType: "RECEIVING" },
    })

    expect(movements.length).toBe(2)
    expect(movements[0].type).toBe("PURCHASE_RECEIPT")
  })
})

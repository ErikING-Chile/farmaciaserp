import { prisma } from "@/lib/prisma"

interface ConfirmReceivingInput {
  receivingId: string
  tenantId: string
  userId: string
}

export async function confirmReceiving({
  receivingId,
  tenantId,
  userId,
}: ConfirmReceivingInput) {
  return prisma.$transaction(async (tx) => {
    const receiving = await tx.receiving.findFirst({
      where: {
        id: receivingId,
        tenantId,
      },
      include: {
        items: true,
      },
    })

    if (!receiving) {
      throw new Error("Receiving not found")
    }

    if (receiving.status === "RECEIVED") {
      return receiving
    }

    if (receiving.status === "CANCELLED") {
      throw new Error("Receiving is cancelled")
    }

    const missingLot = receiving.items.find(
      (item) => !item.batchLotNumber || !item.expirationDate
    )

    if (missingLot) {
      throw new Error("Missing lot or expiration date")
    }

    const updatedReceiving = await tx.receiving.update({
      where: { id: receiving.id },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
      },
    })

    for (const item of receiving.items) {
      const existingBatch = await tx.batch.findFirst({
        where: {
          tenantId,
          productId: item.productId,
          lotNumber: item.batchLotNumber,
          expirationDate: item.expirationDate,
          branchId: receiving.branchId,
          warehouseId: receiving.warehouseId,
        },
      })

      const batch = existingBatch
        ? await tx.batch.update({
            where: { id: existingBatch.id },
            data: {
              remainingQty: { increment: item.quantity },
              unitCost: item.unitCost,
              isActive: true,
            },
          })
        : await tx.batch.create({
            data: {
              lotNumber: item.batchLotNumber,
              expirationDate: item.expirationDate,
              initialQty: item.quantity,
              remainingQty: item.quantity,
              unitCost: item.unitCost,
              tenantId,
              productId: item.productId,
              branchId: receiving.branchId,
              warehouseId: receiving.warehouseId,
              isActive: true,
            },
          })

      await tx.stockMovement.create({
        data: {
          type: "PURCHASE_RECEIPT",
          quantity: item.quantity,
          qtyIn: item.quantity,
          qtyOut: 0,
          unitCost: item.unitCost,
          tenantId,
          branchId: receiving.branchId,
          warehouseId: receiving.warehouseId,
          productId: item.productId,
          batchId: batch.id,
          refType: "RECEIVING",
          refId: receiving.id,
          createdBy: userId,
        },
      })
    }

    if (receiving.invoiceId) {
      await tx.purchaseInvoice.update({
        where: { id: receiving.invoiceId },
        data: { status: "RECEIVED" },
      })
    }

    return updatedReceiving
  })
}

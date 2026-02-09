import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface NewReceiptPageProps {
  params: Promise<{ id: string }>
}

async function getData(tenantId: string, supplierId: string) {
  const [supplier, products, branches, warehouses, invoices] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: supplierId, tenantId } }),
    prisma.product.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.purchaseInvoice.findMany({
      where: { tenantId, supplierId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  return { supplier, products, branches, warehouses, invoices }
}

export default async function NewReceiptPage({ params }: NewReceiptPageProps) {
  const user = await requireAuth()
  const { id } = await params
  const { supplier, products, branches, warehouses, invoices } = await getData(user.tenantId, id)

  if (!supplier) {
    redirect("/suppliers")
  }

  async function createReceiving(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const branchId = String(formData.get("branchId") || "") || user.branchId
    const warehouseId = String(formData.get("warehouseId") || "")
    const invoiceId = String(formData.get("invoiceId") || "")

    if (!branchId || !warehouseId) {
      return
    }

    const [branch, warehouse] = await Promise.all([
      prisma.branch.findFirst({ where: { id: branchId, tenantId: user.tenantId } }),
      prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId: user.tenantId } }),
    ])

    if (!branch || !warehouse) {
      return
    }

    if (warehouse.branchId && warehouse.branchId !== branchId) {
      return
    }

    const productIds = formData.getAll("productId").map((value) => String(value))
    const quantities = formData.getAll("quantity").map((value) => Number(value))
    const unitCosts = formData.getAll("unitCost").map((value) => Number(value))
    const lotNumbers = formData.getAll("lotNumber").map((value) => String(value))
    const expirations = formData.getAll("expiryDate").map((value) => String(value))

    const items = productIds
      .map((productId, index) => ({
        productId,
        quantity: quantities[index] || 0,
        unitCost: unitCosts[index] || 0,
        batchLotNumber: lotNumbers[index] || "",
        expirationDate: expirations[index] || "",
      }))
      .filter((item) => item.productId && item.quantity > 0)

    if (items.length === 0) {
      return
    }

    const missingLotInfo = items.some(
      (item) => !item.batchLotNumber || !item.expirationDate
    )

    if (missingLotInfo) {
      return
    }

    if (invoiceId) {
      const invoice = await prisma.purchaseInvoice.findFirst({
        where: { id: invoiceId, supplierId: id, tenantId: user.tenantId },
      })

      if (!invoice) {
        return
      }
    }

    const receiving = await prisma.receiving.create({
      data: {
        tenantId: user.tenantId,
        supplierId: id,
        branchId,
        warehouseId,
        invoiceId: invoiceId || null,
        notes: String(formData.get("notes") || "") || null,
        status: "DRAFT",
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            batchLotNumber: item.batchLotNumber,
            expirationDate: new Date(item.expirationDate),
            tenantId: user.tenantId,
          })),
        },
      },
    })

    redirect(`/suppliers/receipts/${receiving.id}`)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva recepcion</h1>
        <p className="mt-1 text-sm text-gray-500">Proveedor: {supplier.name}</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form action={createReceiving} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sucursal *</Label>
              <select
                name="branchId"
                defaultValue={user.branchId || ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Seleccionar</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Bodega *</Label>
              <select
                name="warehouseId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Seleccionar</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Factura asociada</Label>
              <select
                name="invoiceId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Sin factura</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    #{invoice.invoiceNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Notas</Label>
              <textarea
                name="notes"
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">Lineas</h2>
            <div className="mt-3 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <select
                    name="productId"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">Producto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <Input name="quantity" type="number" min="0" step="1" placeholder="Cantidad" />
                  <Input name="unitCost" type="number" min="0" step="0.01" placeholder="Costo" />
                  <Input name="lotNumber" placeholder="Lote" />
                  <Input name="expiryDate" type="date" />
                  <div className="text-sm text-gray-500 flex items-center">Linea #{index + 1}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Guardar recepcion</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface NewInvoicePageProps {
  params: Promise<{ id: string }>
}

async function getData(tenantId: string, supplierId: string) {
  const [supplier, products, branches, taxRates] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: supplierId, tenantId } }),
    prisma.product.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.taxRate.findMany({ where: { tenantId }, orderBy: { isDefault: "desc" } }),
  ])

  return { supplier, products, branches, taxRates }
}

export default async function NewInvoicePage({ params }: NewInvoicePageProps) {
  const user = await requireAuth()
  const { id } = await params
  const { supplier, products, branches, taxRates } = await getData(user.tenantId, id)

  if (!supplier) {
    redirect("/suppliers")
  }

  async function createInvoice(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const invoiceNumber = String(formData.get("invoiceNumber") || "").trim()
    const invoiceDate = String(formData.get("invoiceDate") || "")
    const dueDate = String(formData.get("dueDate") || "")
    const branchId = String(formData.get("branchId") || "") || user.branchId

    if (!invoiceNumber || !invoiceDate || !branchId) {
      return
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId: user.tenantId },
    })

    if (!branch) {
      return
    }

    const productIds = formData.getAll("productId").map((value) => String(value))
    const quantities = formData.getAll("quantity").map((value) => Number(value))
    const unitCosts = formData.getAll("unitCost").map((value) => Number(value))
    const discounts = formData.getAll("discount").map((value) => Number(value))

    const items = productIds
      .map((productId, index) => ({
        productId,
        quantity: quantities[index] || 0,
        unitCost: unitCosts[index] || 0,
        discount: discounts[index] || 0,
      }))
      .filter((item) => item.productId && item.quantity > 0)

    if (items.length === 0) {
      return
    }

    const netAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost * (1 - item.discount / 100),
      0
    )

    const defaultTaxRate = await prisma.taxRate.findFirst({
      where: { tenantId: user.tenantId, isDefault: true },
    })

    const taxRate = defaultTaxRate ? Number(defaultTaxRate.rate) : 19
    const taxAmount = netAmount * (taxRate / 100)
    const totalAmount = netAmount + taxAmount

    await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        netAmount,
        taxAmount,
        totalAmount,
        status: "DRAFT",
        tenantId: user.tenantId,
        supplierId: id,
        branchId,
        notes: String(formData.get("notes") || "") || null,
        items: {
          create: items.map((item) => ({
            quantity: item.quantity,
            unitCost: item.unitCost,
            discount: item.discount,
            total: item.quantity * item.unitCost * (1 - item.discount / 100),
            productId: item.productId,
            tenantId: user.tenantId,
            taxRateId: defaultTaxRate?.id || null,
          })),
        },
      },
    })

    redirect(`/suppliers/${id}`)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva factura</h1>
        <p className="mt-1 text-sm text-gray-500">Proveedor: {supplier.name}</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form action={createInvoice} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Numero factura *</Label>
              <Input name="invoiceNumber" required />
            </div>
            <div className="space-y-2">
              <Label>Fecha emision *</Label>
              <Input name="invoiceDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Fecha vencimiento</Label>
              <Input name="dueDate" type="date" />
            </div>
            <div className="space-y-2 md:col-span-2">
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
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                  <Input name="unitCost" type="number" min="0" step="0.01" placeholder="Costo unit." />
                  <Input name="discount" type="number" min="0" step="0.01" placeholder="Desc. %" />
                  <div className="flex items-center text-sm text-gray-500">
                    {taxRates.find((rate) => rate.isDefault)?.name || "IVA"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Crear factura</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

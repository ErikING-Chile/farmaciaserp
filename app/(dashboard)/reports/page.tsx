import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface ReportsPageProps {
  searchParams: {
    from?: string
    to?: string
    supplierId?: string
    branchId?: string
    warehouseId?: string
    expiryDays?: string
  }
}

function getDefaultDateRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from, to }
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await requireAuth()
  const { from: defaultFrom, to: defaultTo } = getDefaultDateRange()
  const fromDate = searchParams.from ? new Date(searchParams.from) : defaultFrom
  const toDate = searchParams.to ? new Date(searchParams.to) : defaultTo
  const supplierId = searchParams.supplierId || ""
  const branchId = searchParams.branchId || user.branchId || ""
  const warehouseId = searchParams.warehouseId || ""
  const expiryDays = Number(searchParams.expiryDays || 30)

  const [suppliers, branches, warehouses] = await Promise.all([
    prisma.supplier.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }),
  ])

  const purchaseWhere = {
    tenantId: user.tenantId,
    invoiceDate: { gte: fromDate, lte: toDate },
    ...(supplierId ? { supplierId } : {}),
    ...(branchId ? { branchId } : {}),
  }

  const purchases = await prisma.purchaseInvoice.findMany({
    where: purchaseWhere,
    include: { supplier: true, items: true },
  })

  const purchaseTotals = purchases.reduce(
    (acc, invoice) => {
      acc.net += Number(invoice.netAmount)
      acc.tax += Number(invoice.taxAmount)
      acc.total += Number(invoice.totalAmount)
      acc.count += 1
      return acc
    },
    { net: 0, tax: 0, total: 0, count: 0 }
  )

  const invoiceIds = purchases.map((invoice) => invoice.id)
  const invoiceItems = invoiceIds.length
    ? await prisma.purchaseInvoiceItem.findMany({
        where: { invoiceId: { in: invoiceIds }, tenantId: user.tenantId },
      })
    : []

  const productTotals = invoiceItems.reduce((acc, item) => {
    const existing = acc.get(item.productId) || { quantity: 0, total: 0 }
    existing.quantity += item.quantity
    existing.total += Number(item.total)
    acc.set(item.productId, existing)
    return acc
  }, new Map<string, { quantity: number; total: number }>())

  const productIds = Array.from(productTotals.keys())
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } } })
    : []

  const topProducts = products
    .map((product) => {
      const totals = productTotals.get(product.id) || { quantity: 0, total: 0 }
      return {
        name: product.name,
        quantity: totals.quantity,
        total: totals.total,
      }
    })
    .sort((a, b) => (b?.total || 0) - (a?.total || 0))
    .slice(0, 5)

  const batchWhere = {
    tenantId: user.tenantId,
    ...(branchId ? { branchId } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    remainingQty: { gt: 0 },
  }

  const batches = await prisma.batch.findMany({
    where: batchWhere,
    include: { product: true, branch: true, warehouse: true },
  })

  const stockValuation = batches.reduce((sum, batch) => {
    return sum + batch.remainingQty * Number(batch.unitCost)
  }, 0)

  const expiryLimit = new Date()
  expiryLimit.setDate(expiryLimit.getDate() + expiryDays)

  const expiringBatches = batches
    .filter((batch) => batch.expirationDate <= expiryLimit)
    .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime())

  const stockRule = await prisma.alertRule.findFirst({
    where: {
      tenantId: user.tenantId,
      type: "STOCK_MIN",
      ...(branchId ? { branchId } : {}),
    },
  })

  const minStockDefault = Number(
    (stockRule?.params as { minStock?: number } | null)?.minStock || 0
  )

  const lowStock = batches
    .reduce((acc, batch) => {
      if (!acc.has(batch.productId)) {
        acc.set(batch.productId, { product: batch.product, quantity: 0 })
      }
      acc.get(batch.productId)!.quantity += batch.remainingQty
      return acc
    }, new Map<string, { product: typeof batches[number]["product"]; quantity: number }>())

  const lowStockList = Array.from(lowStock.values()).filter(({ product, quantity }) => {
    const minStock = minStockDefault || product.minStock
    return quantity <= minStock
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="mt-1 text-sm text-gray-500">Indicadores de compras e inventario.</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Compras por proveedor</h2>
        <form className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input name="from" type="date" defaultValue={fromDate.toISOString().slice(0, 10)} />
          <Input name="to" type="date" defaultValue={toDate.toISOString().slice(0, 10)} />
          <select name="supplierId" defaultValue={supplierId} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
            <option value="">Proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <select name="branchId" defaultValue={branchId} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
            <option value="">Sucursal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <button className="h-9 rounded-md bg-gray-900 text-white text-sm">Aplicar</button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border rounded-md p-4">
            <p className="text-sm text-gray-500">Total neto</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(purchaseTotals.net)}</p>
          </div>
          <div className="border rounded-md p-4">
            <p className="text-sm text-gray-500">IVA</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(purchaseTotals.tax)}</p>
          </div>
          <div className="border rounded-md p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(purchaseTotals.total)}</p>
          </div>
          <div className="border rounded-md p-4">
            <p className="text-sm text-gray-500">Facturas</p>
            <p className="text-lg font-semibold text-gray-900">{purchaseTotals.count}</p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Top productos</h3>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {topProducts.length === 0 ? (
              <p>Sin datos en el rango.</p>
            ) : (
              topProducts.map((product) => (
                <div key={product.name} className="flex justify-between">
                  <span>{product.name}</span>
                  <span>{formatCurrency(product.total || 0)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Stock valorizado</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select name="branchId" defaultValue={branchId} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Sucursal</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <select name="warehouseId" defaultValue={warehouseId} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
              <option value="">Bodega</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
            <button className="h-9 rounded-md bg-gray-900 text-white text-sm">Aplicar</button>
          </form>
          <div className="border rounded-md p-4">
            <p className="text-sm text-gray-500">Total valorizado</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(stockValuation)}</p>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Vencimientos</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="expiryDays" type="number" min="1" defaultValue={expiryDays} />
            <button className="h-9 rounded-md bg-gray-900 text-white text-sm">Aplicar</button>
          </form>
          <div className="space-y-2 text-sm text-gray-600">
            {expiringBatches.length === 0 ? (
              <p>Sin lotes proximos a vencer.</p>
            ) : (
              expiringBatches.slice(0, 10).map((batch) => (
                <div key={batch.id} className="flex justify-between">
                  <span>{batch.product.name} · {batch.lotNumber}</span>
                  <span>{formatDateShort(batch.expirationDate)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900">Stock bajo minimo</h2>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          {lowStockList.length === 0 ? (
            <p>Sin quiebres de stock.</p>
          ) : (
            lowStockList.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between">
                <span>{product.name}</span>
                <span>{quantity} / {minStockDefault || product.minStock}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

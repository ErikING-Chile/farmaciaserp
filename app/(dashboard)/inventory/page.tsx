import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatDateShort } from "@/lib/utils"
import { AlertTriangle, Package } from "lucide-react"

async function getInventory(tenantId: string) {
  const expiringThreshold = new Date()
  expiringThreshold.setDate(expiringThreshold.getDate() + 30)

  // Get all active products with their stock levels
  const products = await prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    include: {
      category: true,
      batches: {
        where: {
          remainingQty: { gt: 0 },
          isActive: true,
        },
        orderBy: { expirationDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  // Calculate stock for each product
  const inventoryWithStock = products.map((product) => {
    const totalStock = product.batches.reduce((sum, batch) => sum + batch.remainingQty, 0)
    const hasLowStock = totalStock < product.minStock
    const expiringBatches = product.batches.filter(
      (batch) => new Date(batch.expirationDate) < expiringThreshold
    )
    const nextBatch = product.batches[0]
    const nextBatchExpiringSoon = nextBatch
      ? new Date(nextBatch.expirationDate) < expiringThreshold
      : false

    return {
      ...product,
      totalStock,
      hasLowStock,
      expiringBatches,
      nextBatchExpiringSoon,
    }
  })

  return inventoryWithStock
}

export default async function InventoryPage() {
  const user = await requireAuth()
  const inventory = await getInventory(user.tenantId)

  const lowStockCount = inventory.filter((item) => item.hasLowStock).length
  const expiringCount = inventory.filter((item) => item.expiringBatches.length > 0).length

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestione stock por producto y lotes
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/adjust">
            <Button variant="outline">
              Ajustar Stock
            </Button>
          </Link>
          <Link href="/inventory/transfer">
            <Button variant="outline">
              Transferir
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-900">Stock Bajo</p>
            <p className="text-2xl font-bold text-red-700">{lowStockCount}</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-900">Por Vencer</p>
            <p className="text-2xl font-bold text-yellow-700">{expiringCount}</p>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Mínimo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lotes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Próximo Vencimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No hay productos en el inventario</p>
                  </td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.sku}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        item.hasLowStock ? "text-red-600" : "text-gray-900"
                      }`}>
                        {item.totalStock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.minStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.batches.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.batches.length > 0 ? (
                        <span className={`text-sm ${
                          item.nextBatchExpiringSoon
                            ? "text-yellow-600 font-medium"
                            : "text-gray-500"
                        }`}>
                          {formatDateShort(item.batches[0].expirationDate)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.hasLowStock ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Stock Bajo
                        </span>
                      ) : item.expiringBatches.length > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Por Vencer
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

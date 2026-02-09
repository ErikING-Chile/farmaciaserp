import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { confirmReceiving } from "@/lib/receivings"
import { Button } from "@/components/ui/button"
import { formatDateShort } from "@/lib/utils"

interface ReceiptDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ReceiptDetailPage({ params }: ReceiptDetailPageProps) {
  const user = await requireAuth()
  const { id } = await params

  const receiving = await prisma.receiving.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      items: { include: { product: true } },
      supplier: true,
      branch: true,
      warehouse: true,
    },
  })

  if (!receiving) {
    redirect("/suppliers")
  }

  async function confirmAction() {
    "use server"

    const user = await requireAuth()
    await confirmReceiving({
      receivingId: receiving.id,
      tenantId: user.tenantId,
      userId: user.id,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recepcion</h1>
          <p className="mt-1 text-sm text-gray-500">
            {receiving.supplier.name} · {formatDateShort(receiving.receivedAt)}
          </p>
        </div>
        {receiving.status === "DRAFT" && (
          <form action={confirmAction}>
            <Button type="submit">Confirmar recepcion</Button>
          </form>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <p className="text-gray-500">Sucursal</p>
            <p className="font-medium text-gray-900">{receiving.branch.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Bodega</p>
            <p className="font-medium text-gray-900">{receiving.warehouse.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Estado</p>
            <p className="font-medium text-gray-900">{receiving.status}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Lineas recibidas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receiving.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.product.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.unitCost.toString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.batchLotNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateShort(item.expirationDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

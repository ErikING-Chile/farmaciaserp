import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  FileText, 
  Search, 
  Plus, 
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight
} from "lucide-react"
import Link from "next/link"

interface PurchasesPageProps {
  searchParams: {
    search?: string
    status?: string
    page?: string
  }
}

async function getPurchases(
  tenantId: string,
  search: string,
  status: string,
  page: number
) {
  const limit = 20
  const skip = (page - 1) * limit

  let where: any = {
    tenantId,
  }

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { supplier: { name: { contains: search, mode: "insensitive" } } },
    ]
  }

  if (status && status !== "all") {
    where.status = status.toUpperCase()
  }

  const [purchases, total] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: { name: true, sku: true },
            },
          },
        },
        receivings: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseInvoice.count({ where }),
  ])

  // Calculate totals per purchase
  const purchasesWithTotals = purchases.map((purchase: any) => {
    const totalReceived = purchase.receivings.reduce((sum: number, rec: any) => {
      return sum + rec.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0)
    }, 0)
    
    const totalOrdered = purchase.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    
    return {
      ...purchase,
      totalReceived,
      totalOrdered,
      isFullyReceived: totalReceived >= totalOrdered,
    }
  })

  return {
    purchases: purchasesWithTotals,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export default async function PurchasesPage({ searchParams }: PurchasesPageProps) {
  const user = await requireAuth()
  const search = searchParams.search || ""
  const status = searchParams.status || "all"
  const page = parseInt(searchParams.page || "1")

  const { purchases, total, totalPages } = await getPurchases(
    user.tenantId,
    search,
    status,
    page
  )

  const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
    DRAFT: { label: "Borrador", color: "bg-gray-100 text-gray-800", icon: Clock },
    RECEIVED: { label: "Recibido", color: "bg-green-100 text-green-800", icon: CheckCircle },
    POSTED: { label: "Contabilizado", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
    CANCELLED: { label: "Anulado", color: "bg-red-100 text-red-800", icon: XCircle },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de facturas de compra y recepciones
          </p>
        </div>
        <Link href="/purchases/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Compra
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  name="search"
                  type="search"
                  placeholder="Buscar por número o proveedor..."
                  defaultValue={search}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">
                Buscar
              </Button>
            </form>

            {/* Status Filter */}
            <div className="flex gap-2">
              {["all", "draft", "received", "posted"].map((s) => (
                <Link
                  key={s}
                  href={`/purchases?status=${s}${search ? `&search=${search}` : ""}`}
                >
                  <Button
                    variant={status === s ? "default" : "outline"}
                    size="sm"
                  >
                    {s === "all" ? "Todos" : 
                     s === "draft" ? "Borradores" :
                     s === "received" ? "Recibidos" : "Contabilizados"}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Recepción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No se encontraron compras</p>
                  </td>
                </tr>
              ) : (
                purchases.map((purchase: any) => {
                  const statusConfig = statusLabels[purchase.status] || statusLabels.DRAFT
                  const StatusIcon = statusConfig.icon

                  return (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            #{purchase.invoiceNumber}
                          </p>
                          <p className="text-sm text-gray-500">
                            {purchase.items.length} productos
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {purchase.supplier.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {purchase.supplier.rut || "Sin RUT"}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(purchase.invoiceDate)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(Number(purchase.totalAmount))}
                        </p>
                        <p className="text-sm text-gray-500">
                          Neto: {formatCurrency(Number(purchase.netAmount))}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {purchase.status === "DRAFT" ? (
                          <span className="text-sm text-gray-400">-</span>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-900">
                              {purchase.totalReceived} / {purchase.totalOrdered} unidades
                            </p>
                            <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{
                                  width: `${purchase.totalOrdered > 0 
                                    ? (purchase.totalReceived / purchase.totalOrdered) * 100 
                                    : 0}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/purchases/${purchase.id}`}>
                            <Button variant="ghost" size="sm">
                              Ver
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                          {purchase.status === "DRAFT" && (
                            <Link href={`/purchases/${purchase.id}/receive`}>
                              <Button size="sm">
                                Recibir
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Mostrando {purchases.length} de {total} compras
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/purchases?page=${page - 1}${search ? `&search=${search}` : ""}${status !== "all" ? `&status=${status}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    Anterior
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/purchases?page=${page + 1}${search ? `&search=${search}` : ""}${status !== "all" ? `&status=${status}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    Siguiente
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

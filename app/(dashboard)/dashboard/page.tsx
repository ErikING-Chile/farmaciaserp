import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/utils"
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  ShoppingCart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import Link from "next/link"

async function getDashboardStats(tenantId: string, branchId: string | null) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)

  const lastMonth = new Date(today)
  lastMonth.setDate(lastMonth.getDate() - 30)

  const branchFilter = branchId ? { branchId } : {}

  // Today's sales
  const todaySales = await prisma.sale.aggregate({
    where: {
      tenantId,
      ...branchFilter,
      status: "PAID",
      soldAt: { gte: today },
    },
    _sum: { total: true },
    _count: true,
  })

  // Yesterday's sales
  const yesterdaySales = await prisma.sale.aggregate({
    where: {
      tenantId,
      ...branchFilter,
      status: "PAID",
      soldAt: {
        gte: yesterday,
        lt: today,
      },
    },
    _sum: { total: true },
  })

  // Sales last 7 days
  const weeklySales = await prisma.sale.aggregate({
    where: {
      tenantId,
      ...branchFilter,
      status: "PAID",
      soldAt: { gte: lastWeek },
    },
    _sum: { total: true },
    _count: true,
  })

  // Sales last 30 days
  const monthlySales = await prisma.sale.aggregate({
    where: {
      tenantId,
      ...branchFilter,
      status: "PAID",
      soldAt: { gte: lastMonth },
    },
    _sum: { total: true },
    _count: true,
  })

  // Low stock products
  const lowStockProducts = await prisma.product.findMany({
    where: {
      tenantId,
      isActive: true,
      batches: {
        some: {
          remainingQty: { gt: 0 },
        },
      },
    },
    include: {
      batches: {
        where: {
          remainingQty: { gt: 0 },
        },
        select: {
          remainingQty: true,
        },
      },
    },
    take: 100,
  })

  const lowStockCount = lowStockProducts.filter((p: { batches: { remainingQty: number }[], minStock: number }) => {
    const totalStock = p.batches.reduce((sum: number, b: { remainingQty: number }) => sum + b.remainingQty, 0)
    return totalStock <= p.minStock
  }).length

  // Products expiring in 30 days
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const expiringProducts = await prisma.batch.count({
    where: {
      tenantId,
      remainingQty: { gt: 0 },
      expirationDate: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
    },
  })

  // Expired products
  const expiredProducts = await prisma.batch.count({
    where: {
      tenantId,
      remainingQty: { gt: 0 },
      expirationDate: { lt: new Date() },
    },
  })

  // Total products
  const totalProducts = await prisma.product.count({
    where: { tenantId, isActive: true },
  })

  // Recent sales
  const recentSales = await prisma.sale.findMany({
    where: {
      tenantId,
      ...branchFilter,
      status: "PAID",
    },
    include: {
      seller: { select: { name: true } },
      items: { select: { quantity: true } },
    },
    orderBy: { soldAt: "desc" },
    take: 5,
  })

  // Top selling products
  const topProducts = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: {
        tenantId,
        ...branchFilter,
        status: "PAID",
        soldAt: { gte: lastWeek },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  })

  const topProductsWithNames = await Promise.all(
    topProducts.map(async (p: { productId: string, _sum: { quantity: number | null } }) => {
      const product = await prisma.product.findUnique({
        where: { id: p.productId },
        select: { name: true, sku: true },
      })
      return {
        ...p,
        name: product?.name || "Unknown",
        sku: product?.sku || "",
      }
    })
  )

  // Calculate percentage change
  const todayTotal = Number(todaySales._sum.total || 0)
  const yesterdayTotal = Number(yesterdaySales._sum.total || 0)
  const salesChange = yesterdayTotal > 0 
    ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 
    : 0

  return {
    todaySales: todayTotal,
    todayCount: todaySales._count,
    salesChange,
    weeklySales: Number(weeklySales._sum.total || 0),
    weeklyCount: weeklySales._count,
    monthlySales: Number(monthlySales._sum.total || 0),
    monthlyCount: monthlySales._count,
    lowStockCount,
    expiringProducts,
    expiredProducts,
    totalProducts,
    recentSales,
    topProducts: topProductsWithNames,
  }
}

export default async function DashboardPage() {
  const user = await requireAuth()
  const stats = await getDashboardStats(user.tenantId, user.branchId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen de la farmacia - {formatDate(new Date())}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Sales */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.todaySales)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.todayCount} transacciones
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {stats.salesChange >= 0 ? (
              <>
                <ArrowUpRight className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">
                  +{stats.salesChange.toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">
                  {stats.salesChange.toFixed(1)}%
                </span>
              </>
            )}
            <span className="text-sm text-gray-500 ml-1">vs ayer</span>
          </div>
        </div>

        {/* Weekly Sales */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Semana</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.weeklySales)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.weeklyCount} transacciones
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">Últimos 7 días</span>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Mes</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.monthlySales)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.monthlyCount} transacciones
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">Últimos 30 días</span>
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Productos</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalProducts}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                activos en catálogo
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link href="/products" className="text-sm text-blue-600 hover:text-blue-800">
              Ver catálogo →
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Low Stock */}
        <Link href="/inventory?filter=low-stock">
          <div className={`rounded-lg shadow p-6 ${stats.lowStockCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${stats.lowStockCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className={`font-semibold ${stats.lowStockCount > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                  Stock Bajo
                </p>
                <p className={`text-2xl font-bold ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {stats.lowStockCount}
                </p>
                <p className="text-sm text-gray-600">
                  productos por reponer
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Expiring Soon */}
        <Link href="/inventory?filter=expiring">
          <div className={`rounded-lg shadow p-6 ${stats.expiringProducts > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${stats.expiringProducts > 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                <Calendar className={`w-5 h-5 ${stats.expiringProducts > 0 ? 'text-yellow-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className={`font-semibold ${stats.expiringProducts > 0 ? 'text-yellow-900' : 'text-gray-900'}`}>
                  Por Vencer (30d)
                </p>
                <p className={`text-2xl font-bold ${stats.expiringProducts > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {stats.expiringProducts}
                </p>
                <p className="text-sm text-gray-600">
                  lotes próximos a vencer
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* Expired */}
        <Link href="/inventory?filter=expired">
          <div className={`rounded-lg shadow p-6 ${stats.expiredProducts > 0 ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${stats.expiredProducts > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${stats.expiredProducts > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className={`font-semibold ${stats.expiredProducts > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                  Vencidos
                </p>
                <p className={`text-2xl font-bold ${stats.expiredProducts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {stats.expiredProducts}
                </p>
                <p className="text-sm text-gray-600">
                  lotes vencidos en stock
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ventas Recientes</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentSales.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No hay ventas recientes</p>
              </div>
            ) : (
              stats.recentSales.map((sale) => (
                <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">Boleta #{sale.saleNumber}</p>
                    <p className="text-sm text-gray-500">
                      {sale.seller?.name || "Vendedor"} • {formatDate(sale.soldAt)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {sale.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)} productos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(Number(sale.total))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-200">
            <Link href="/reports/sales" className="text-sm text-blue-600 hover:text-blue-800">
              Ver todas las ventas →
            </Link>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Productos Más Vendidos</h2>
            <p className="text-sm text-gray-500">Últimos 7 días</p>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.topProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No hay datos de ventas</p>
              </div>
            ) : (
              stats.topProducts.map((product, index) => (
                <div key={product.productId} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {product._sum.quantity} unidades
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-200">
            <Link href="/reports/products" className="text-sm text-blue-600 hover:text-blue-800">
              Ver reporte completo →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

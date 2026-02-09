import Link from "next/link"
import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus } from "lucide-react"

interface SuppliersPageProps {
  searchParams: {
    search?: string
    status?: string
  }
}

async function getSuppliers(tenantId: string, search: string, status: string) {
  return prisma.supplier.findMany({
    where: {
      tenantId,
      ...(status && status !== "all" ? { status: status.toUpperCase() as "ACTIVE" | "INACTIVE" } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { rut: { contains: search, mode: "insensitive" } },
              { legalName: { contains: search, mode: "insensitive" } },
              { tradeName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  })
}

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const user = await requireAuth()
  const search = searchParams.search || ""
  const status = searchParams.status || "all"
  const suppliers = await getSuppliers(user.tenantId, search, status)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona proveedores, contactos y condiciones comerciales.
          </p>
        </div>
        <Link href="/suppliers/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo proveedor
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <form className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                name="search"
                placeholder="Buscar por nombre o RUT..."
                defaultValue={search}
                className="pl-10"
              />
            </div>
            <select
              name="status"
              defaultValue={status}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RUT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron proveedores.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{supplier.name}</p>
                      <p className="text-sm text-gray-500">{supplier.tradeName || supplier.legalName || "-"}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{supplier.rut || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {supplier.contactName || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${supplier.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {supplier.status === "ACTIVE" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/suppliers/${supplier.id}`}>
                        <Button size="sm" variant="outline">Ver detalle</Button>
                      </Link>
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

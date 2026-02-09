import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

async function getData(tenantId: string) {
  const [branches, warehouses] = await Promise.all([
    prisma.branch.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({
      where: { tenantId },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
  ])

  return { branches, warehouses }
}

export default async function WarehousesPage() {
  const user = await requireAuth()
  const { branches, warehouses } = await getData(user.tenantId)

  async function createWarehouse(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const name = String(formData.get("name") || "").trim()
    const branchId = String(formData.get("branchId") || "")
    if (!name || !branchId) {
      return
    }

    const isDefault = formData.get("isDefault") === "on"

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.warehouse.updateMany({
          where: { tenantId: user.tenantId },
          data: { isDefault: false },
        })
      }

      await tx.warehouse.create({
        data: {
          name,
          type: "MAIN",
          address: String(formData.get("address") || "") || null,
          branchId,
          tenantId: user.tenantId,
          isDefault,
          isActive: formData.get("isActive") === "on",
        },
      })
    })
  }

  async function updateWarehouse(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const id = String(formData.get("id") || "")
    const name = String(formData.get("name") || "").trim()
    const branchId = String(formData.get("branchId") || "")
    if (!id || !name || !branchId) {
      return
    }

    const isDefault = formData.get("isDefault") === "on"

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.warehouse.updateMany({
          where: { tenantId: user.tenantId },
          data: { isDefault: false },
        })
      }

      await tx.warehouse.update({
        where: { id, tenantId: user.tenantId },
        data: {
          name,
          address: String(formData.get("address") || "") || null,
          branchId,
          isDefault,
          isActive: formData.get("isActive") === "on",
        },
      })
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bodegas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura las bodegas por sucursal.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900">Nueva bodega</h2>
        <form action={createWarehouse} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branchId">Sucursal *</Label>
            <select
              id="branchId"
              name="branchId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              required
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
            <Label htmlFor="address">Direccion</Label>
            <Input id="address" name="address" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="isDefault" />
              Por defecto
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="isActive" defaultChecked />
              Activa
            </label>
          </div>
          <div className="flex items-end">
            <Button type="submit">Crear bodega</Button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Bodegas existentes</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {warehouses.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Sin bodegas registradas.</div>
          ) : (
            warehouses.map((warehouse) => (
              <form key={warehouse.id} action={updateWarehouse} className="p-4 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <input type="hidden" name="id" value={warehouse.id} />
                <div className="space-y-2 md:col-span-2">
                  <Label>Nombre</Label>
                  <Input name="name" defaultValue={warehouse.name} />
                </div>
                <div className="space-y-2">
                  <Label>Sucursal</Label>
                  <select
                    name="branchId"
                    defaultValue={warehouse.branchId || ""}
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
                <div className="space-y-2 md:col-span-2">
                  <Label>Direccion</Label>
                  <Input name="address" defaultValue={warehouse.address || ""} />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="isDefault" defaultChecked={warehouse.isDefault} />
                  Por defecto
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="isActive" defaultChecked={warehouse.isActive} />
                  Activa
                </label>
                <div>
                  <Button type="submit" variant="outline">Guardar</Button>
                </div>
              </form>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

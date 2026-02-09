import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

async function getBranches(tenantId: string) {
  return prisma.branch.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  })
}

export default async function BranchesPage() {
  const user = await requireAuth()
  const branches = await getBranches(user.tenantId)

  async function createBranch(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const name = String(formData.get("name") || "").trim()
    if (!name) {
      return
    }

    await prisma.branch.create({
      data: {
        name,
        address: String(formData.get("address") || "") || null,
        city: String(formData.get("city") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        isActive: formData.get("isActive") === "on",
        tenantId: user.tenantId,
      },
    })
  }

  async function updateBranch(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const id = String(formData.get("id") || "")
    const name = String(formData.get("name") || "").trim()
    if (!id || !name) {
      return
    }

    await prisma.branch.update({
      where: { id, tenantId: user.tenantId },
      data: {
        name,
        address: String(formData.get("address") || "") || null,
        city: String(formData.get("city") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        isActive: formData.get("isActive") === "on",
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sucursales</h1>
        <p className="mt-1 text-sm text-gray-500">
          Administra sucursales para el tenant actual.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900">Nueva sucursal</h2>
        <form action={createBranch} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Comuna / Ciudad</Label>
            <Input id="city" name="city" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Direccion</Label>
            <Input id="address" name="address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" name="phone" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="isActive" defaultChecked />
            Activa
          </label>
          <div className="flex items-end">
            <Button type="submit">Crear sucursal</Button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sucursales existentes</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {branches.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Sin sucursales registradas.</div>
          ) : (
            branches.map((branch) => (
              <form key={branch.id} action={updateBranch} className="p-4 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <input type="hidden" name="id" value={branch.id} />
                <div className="space-y-2 md:col-span-2">
                  <Label>Nombre</Label>
                  <Input name="name" defaultValue={branch.name} />
                </div>
                <div className="space-y-2">
                  <Label>Comuna / Ciudad</Label>
                  <Input name="city" defaultValue={branch.city || ""} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Direccion</Label>
                  <Input name="address" defaultValue={branch.address || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Telefono</Label>
                  <Input name="phone" defaultValue={branch.phone || ""} />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="isActive" defaultChecked={branch.isActive} />
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

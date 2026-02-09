import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

async function getData(tenantId: string) {
  const [branches, rules] = await Promise.all([
    prisma.branch.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.alertRule.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
  ])
  return { branches, rules }
}

export default async function AlertRulesPage() {
  const user = await requireAuth()
  const { branches, rules } = await getData(user.tenantId)
  const branchLookup = new Map(branches.map((branch) => [branch.id, branch.name]))

  async function createRule(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const type = String(formData.get("type") || "")
    const branchId = String(formData.get("branchId") || "")
    const days = Number(formData.get("days") || 30)
    const minStock = Number(formData.get("minStock") || 0)
    if (!type) {
      return
    }

    const params =
      type === "EXPIRY_SOON"
        ? { days }
        : { minStock }

    await prisma.alertRule.create({
      data: {
        type: type as "STOCK_MIN" | "EXPIRY_SOON",
        params,
        isActive: true,
        tenantId: user.tenantId,
        branchId: branchId || null,
      },
    })
  }

  async function toggleRule(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const id = String(formData.get("id") || "")
    const isActive = formData.get("isActive") === "on"
    if (!id) {
      return
    }

    await prisma.alertRule.update({
      where: { id, tenantId: user.tenantId },
      data: { isActive },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reglas de alerta</h1>
        <p className="mt-1 text-sm text-gray-500">
          Alertas por stock minimo o vencimientos proximos.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900">Nueva regla</h2>
        <form action={createRule} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <select
              id="type"
              name="type"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="STOCK_MIN">Stock minimo</option>
              <option value="EXPIRY_SOON">Vencimiento proximo</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branchId">Sucursal (opcional)</Label>
            <select
              id="branchId"
              name="branchId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Todas</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="days">Dias / Stock minimo</Label>
            <Input id="days" name="days" type="number" min="0" defaultValue="30" />
            <Input id="minStock" name="minStock" type="number" min="0" defaultValue="0" />
          </div>
          <div className="flex items-end">
            <Button type="submit">Crear regla</Button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reglas activas</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {rules.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Sin reglas registradas.</div>
          ) : (
            rules.map((rule) => (
              <form key={rule.id} action={toggleRule} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{rule.type}</p>
                  <p className="text-sm text-gray-500">
                    {rule.branchId
                      ? `Sucursal: ${branchLookup.get(rule.branchId) || rule.branchId}`
                      : "Todas las sucursales"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="isActive" defaultChecked={rule.isActive} />
                  Activa
                </label>
                <input type="hidden" name="id" value={rule.id} />
                <Button type="submit" variant="outline">Guardar</Button>
              </form>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

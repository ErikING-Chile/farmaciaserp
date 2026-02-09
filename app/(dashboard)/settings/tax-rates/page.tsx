import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

async function getTaxRates(tenantId: string) {
  return prisma.taxRate.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  })
}

export default async function TaxRatesPage() {
  const user = await requireAuth()
  const taxRates = await getTaxRates(user.tenantId)

  async function createTaxRate(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const name = String(formData.get("name") || "").trim()
    const rate = Number(formData.get("rate") || 0)
    if (!name) {
      return
    }

    const isDefault = formData.get("isDefault") === "on"

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.taxRate.updateMany({
          where: { tenantId: user.tenantId },
          data: { isDefault: false },
        })
      }

      await tx.taxRate.create({
        data: {
          name,
          rate,
          isDefault,
          tenantId: user.tenantId,
        },
      })
    })
  }

  async function setDefault(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const id = String(formData.get("id") || "")
    if (!id) {
      return
    }

    await prisma.$transaction(async (tx) => {
      await tx.taxRate.updateMany({
        where: { tenantId: user.tenantId },
        data: { isDefault: false },
      })

      await tx.taxRate.update({
        where: { id, tenantId: user.tenantId },
        data: { isDefault: true },
      })
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Impuestos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Define tasas e impuesto por defecto.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900">Nueva tasa</h2>
        <form action={createTaxRate} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required placeholder="IVA 19%" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Tasa (%)</Label>
            <Input id="rate" name="rate" type="number" min="0" step="0.01" defaultValue="19" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="isDefault" />
            Por defecto
          </label>
          <div className="flex items-end">
            <Button type="submit">Crear tasa</Button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tasas registradas</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {taxRates.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Sin tasas registradas.</div>
          ) : (
            taxRates.map((taxRate) => (
              <div key={taxRate.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{taxRate.name}</p>
                  <p className="text-sm text-gray-500">{taxRate.rate.toString()}%</p>
                </div>
                <form action={setDefault}>
                  <input type="hidden" name="id" value={taxRate.id} />
                  <Button type="submit" variant={taxRate.isDefault ? "default" : "outline"}>
                    {taxRate.isDefault ? "Por defecto" : "Marcar por defecto"}
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

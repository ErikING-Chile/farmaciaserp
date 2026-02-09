import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { redirect } from "next/navigation"

export default async function NewSupplierPage() {
  await requireAuth()

  async function createSupplier(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const name = String(formData.get("name") || "").trim()
    if (!name) {
      return
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        rut: String(formData.get("rut") || "") || null,
        legalName: String(formData.get("legalName") || "") || null,
        tradeName: String(formData.get("tradeName") || "") || null,
        giro: String(formData.get("giro") || "") || null,
        contactName: String(formData.get("contactName") || "") || null,
        email: String(formData.get("email") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        address: String(formData.get("address") || "") || null,
        status: formData.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        tenantId: user.tenantId,
      },
    })

    redirect(`/suppliers/${supplier.id}`)
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo proveedor</h1>
        <p className="mt-1 text-sm text-gray-500">
          Registra la informacion base del proveedor.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form action={createSupplier} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre comercial *</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rut">RUT</Label>
            <Input id="rut" name="rut" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalName">Razon social</Label>
            <Input id="legalName" name="legalName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tradeName">Nombre fantasia</Label>
            <Input id="tradeName" name="tradeName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="giro">Giro</Label>
            <Input id="giro" name="giro" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactName">Contacto principal</Label>
            <Input id="contactName" name="contactName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Direccion</Label>
            <Input id="address" name="address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              name="status"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit">Crear proveedor</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatDateShort } from "@/lib/utils"

interface SupplierDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const user = await requireAuth()
  const { id } = await params

  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: user.tenantId },
    include: {
      contacts: true,
      terms: true,
      purchaseInvoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      receivings: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  })

  if (!supplier) {
    redirect("/suppliers")
  }

  async function updateSupplier(formData: FormData) {
    "use server"

    const user = await requireAuth()
    await prisma.supplier.update({
      where: { id, tenantId: user.tenantId },
      data: {
        name: String(formData.get("name") || "").trim(),
        rut: String(formData.get("rut") || "") || null,
        legalName: String(formData.get("legalName") || "") || null,
        tradeName: String(formData.get("tradeName") || "") || null,
        giro: String(formData.get("giro") || "") || null,
        contactName: String(formData.get("contactName") || "") || null,
        email: String(formData.get("email") || "") || null,
        phone: String(formData.get("phone") || "") || null,
        address: String(formData.get("address") || "") || null,
        status: formData.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      },
    })
  }

  async function createContact(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const name = String(formData.get("contactName") || "").trim()
    if (!name) {
      return
    }

    const isPrimary = formData.get("isPrimary") === "on"

    await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.supplierContact.updateMany({
          where: { supplierId: id, tenantId: user.tenantId },
          data: { isPrimary: false },
        })
      }

      await tx.supplierContact.create({
        data: {
          name,
          role: String(formData.get("role") || "") || null,
          email: String(formData.get("email") || "") || null,
          phone: String(formData.get("phone") || "") || null,
          isPrimary,
          tenantId: user.tenantId,
          supplierId: id,
        },
      })
    })
  }

  async function deleteContact(formData: FormData) {
    "use server"

    const user = await requireAuth()
    const contactId = String(formData.get("contactId") || "")
    if (!contactId) {
      return
    }

    await prisma.supplierContact.deleteMany({
      where: { id: contactId, tenantId: user.tenantId, supplierId: id },
    })
  }

  async function upsertTerms(formData: FormData) {
    "use server"

    const user = await requireAuth()
    await prisma.supplierTerms.upsert({
      where: { supplierId: id },
      update: {
        paymentTermDays: Number(formData.get("paymentTermDays") || 0),
        creditLimit: formData.get("creditLimit") ? Number(formData.get("creditLimit")) : null,
        currency: String(formData.get("currency") || "CLP"),
        defaultDiscountPct: formData.get("defaultDiscountPct")
          ? Number(formData.get("defaultDiscountPct"))
          : null,
        notes: String(formData.get("notes") || "") || null,
      },
      create: {
        paymentTermDays: Number(formData.get("paymentTermDays") || 0),
        creditLimit: formData.get("creditLimit") ? Number(formData.get("creditLimit")) : null,
        currency: String(formData.get("currency") || "CLP"),
        defaultDiscountPct: formData.get("defaultDiscountPct")
          ? Number(formData.get("defaultDiscountPct"))
          : null,
        notes: String(formData.get("notes") || "") || null,
        tenantId: user.tenantId,
        supplierId: id,
      },
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
          <p className="mt-1 text-sm text-gray-500">RUT: {supplier.rut || "-"}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/suppliers/${supplier.id}/invoices/new`}>
            <Button variant="outline">Nueva factura</Button>
          </Link>
          <Link href={`/suppliers/${supplier.id}/receipts/new`}>
            <Button>Nueva recepcion</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900">Datos del proveedor</h2>
        <form action={updateSupplier} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nombre comercial</Label>
            <Input name="name" defaultValue={supplier.name} />
          </div>
          <div className="space-y-2">
            <Label>RUT</Label>
            <Input name="rut" defaultValue={supplier.rut || ""} />
          </div>
          <div className="space-y-2">
            <Label>Razon social</Label>
            <Input name="legalName" defaultValue={supplier.legalName || ""} />
          </div>
          <div className="space-y-2">
            <Label>Nombre fantasia</Label>
            <Input name="tradeName" defaultValue={supplier.tradeName || ""} />
          </div>
          <div className="space-y-2">
            <Label>Giro</Label>
            <Input name="giro" defaultValue={supplier.giro || ""} />
          </div>
          <div className="space-y-2">
            <Label>Contacto principal</Label>
            <Input name="contactName" defaultValue={supplier.contactName || ""} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="email" type="email" defaultValue={supplier.email || ""} />
          </div>
          <div className="space-y-2">
            <Label>Telefono</Label>
            <Input name="phone" defaultValue={supplier.phone || ""} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Direccion</Label>
            <Input name="address" defaultValue={supplier.address || ""} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <select
              name="status"
              defaultValue={supplier.status}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="outline">Guardar</Button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900">Contactos</h2>
          <form action={createContact} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input name="contactName" placeholder="Nombre" />
              <Input name="role" placeholder="Cargo" />
              <Input name="email" type="email" placeholder="Email" />
              <Input name="phone" placeholder="Telefono" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" name="isPrimary" />
              Contacto principal
            </label>
            <Button type="submit" variant="outline">Agregar contacto</Button>
          </form>

          <div className="mt-4 space-y-3">
            {supplier.contacts.length === 0 ? (
              <p className="text-sm text-gray-500">Sin contactos registrados.</p>
            ) : (
              supplier.contacts.map((contact) => (
                <div key={contact.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{contact.name}</p>
                      <p className="text-sm text-gray-500">{contact.role || "-"}</p>
                      <p className="text-sm text-gray-500">{contact.email || "-"}</p>
                      <p className="text-sm text-gray-500">{contact.phone || "-"}</p>
                    </div>
                    {contact.isPrimary && (
                      <span className="text-xs text-blue-600">Principal</span>
                    )}
                  </div>
                  <form action={deleteContact}>
                    <input type="hidden" name="contactId" value={contact.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Eliminar
                    </Button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900">Condiciones</h2>
          <form action={upsertTerms} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Dias de pago</Label>
                <Input name="paymentTermDays" type="number" min="0" defaultValue={supplier.terms?.paymentTermDays ?? 0} />
              </div>
              <div className="space-y-2">
                <Label>Limite de credito</Label>
                <Input name="creditLimit" type="number" min="0" step="0.01" defaultValue={supplier.terms?.creditLimit?.toString() || ""} />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Input name="currency" defaultValue={supplier.terms?.currency || "CLP"} />
              </div>
              <div className="space-y-2">
                <Label>Descuento (%)</Label>
                <Input name="defaultDiscountPct" type="number" min="0" step="0.01" defaultValue={supplier.terms?.defaultDiscountPct?.toString() || ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={supplier.terms?.notes || ""}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              />
            </div>
            <Button type="submit" variant="outline">Guardar condiciones</Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900">Facturas</h2>
          <div className="mt-4 space-y-3">
            {supplier.purchaseInvoices.length === 0 ? (
              <p className="text-sm text-gray-500">Sin facturas registradas.</p>
            ) : (
              supplier.purchaseInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="font-medium text-gray-900">#{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">{formatDateShort(invoice.invoiceDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(Number(invoice.totalAmount))}
                    </p>
                    <p className="text-xs text-gray-500">{invoice.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900">Recepciones</h2>
          <div className="mt-4 space-y-3">
            {supplier.receivings.length === 0 ? (
              <p className="text-sm text-gray-500">Sin recepciones registradas.</p>
            ) : (
              supplier.receivings.map((receiving) => (
                <div key={receiving.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="font-medium text-gray-900">Recepcion #{receiving.id.slice(0, 6)}</p>
                    <p className="text-sm text-gray-500">{formatDateShort(receiving.receivedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{receiving.status}</p>
                    <Link href={`/suppliers/receipts/${receiving.id}`}>
                      <Button size="sm" variant="outline">Ver</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

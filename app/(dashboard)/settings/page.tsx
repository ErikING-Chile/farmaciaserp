import Link from "next/link"
import { requireAuth } from "@/lib/session"
import { Button } from "@/components/ui/button"

const sections = [
  {
    title: "Sucursales",
    description: "Administra las sucursales y sus datos base.",
    href: "/settings/branches",
  },
  {
    title: "Bodegas",
    description: "Configura bodegas y su sucursal asociada.",
    href: "/settings/warehouses",
  },
  {
    title: "Impuestos",
    description: "Define tasas y marca el impuesto por defecto.",
    href: "/settings/tax-rates",
  },
  {
    title: "Reglas de alerta",
    description: "Reglas para stock minimo y vencimientos.",
    href: "/settings/alert-rules",
  },
  {
    title: "Roles y permisos",
    description: "Vista general de permisos por rol.",
    href: "/settings/roles",
  },
]

export default async function SettingsPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
        <p className="mt-1 text-sm text-gray-500">
          Preferencias del sistema, usuarios y permisos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {section.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{section.description}</p>
            <div className="mt-4">
              <Link href={section.href}>
                <Button variant="outline">Abrir</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { requireAuth } from "@/lib/session"
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/constants"

export default async function RolesPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles y permisos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vista general de permisos por rol (configuracion fija).
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
              {ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS].map((permission) => (
                <span key={permission} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1">
                  {permission}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

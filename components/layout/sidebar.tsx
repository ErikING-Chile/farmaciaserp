"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  ShoppingCart, 
  Store, 
  ClipboardList,
  BarChart3,
  Settings,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import { ROLE_LABELS, Role } from "@/lib/constants"

interface SidebarProps {
  user: {
    id: string
    name: string | null
    email: string
    role: string
    tenantId: string
    branchId: string | null
  }
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "WAREHOUSE", "SELLER", "ACCOUNTANT", "AUDITOR"] },
  { name: "Productos", href: "/products", icon: Package, roles: ["ADMIN", "MANAGER", "WAREHOUSE", "SELLER", "AUDITOR"] },
  { name: "Proveedores", href: "/suppliers", icon: Truck, roles: ["ADMIN", "MANAGER", "WAREHOUSE", "ACCOUNTANT", "AUDITOR"] },
  { name: "Compras", href: "/purchases", icon: ShoppingCart, roles: ["ADMIN", "MANAGER", "WAREHOUSE", "ACCOUNTANT", "AUDITOR"] },
  { name: "Inventario", href: "/inventory", icon: ClipboardList, roles: ["ADMIN", "MANAGER", "WAREHOUSE", "AUDITOR"] },
  { name: "Venta (POS)", href: "/pos", icon: Store, roles: ["ADMIN", "MANAGER", "SELLER"] },
  { name: "Reportes", href: "/reports", icon: BarChart3, roles: ["ADMIN", "MANAGER", "ACCOUNTANT", "AUDITOR"] },
  { name: "Configuración", href: "/settings", icon: Settings, roles: ["ADMIN", "MANAGER"] },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const userRole = user.role as Role

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  )

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Farmacia ERP</span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {filteredNavigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                          ? "bg-gray-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-50 hover:text-blue-600",
                        "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6"
                      )}
                    >
                      <item.icon
                        className={cn(
                          pathname === item.href || pathname.startsWith(`${item.href}/`)
                            ? "text-blue-600"
                            : "text-gray-400 group-hover:text-blue-600",
                          "h-6 w-6 shrink-0"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>

            <li className="mt-auto">
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-x-3 px-2 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ROLE_LABELS[userRole]}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Cerrar Sesión
                </button>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
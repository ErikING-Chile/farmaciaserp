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
import { ThemeToggle } from "@/components/theme"

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
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r px-6 pb-4 glass-panel-strong">
        <div className="flex h-16 shrink-0 items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-theme">Farmacia ERP</span>
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
                          ? "bg-accent/10 text-accent"
                          : "text-theme-muted hover:bg-theme-panel hover:text-accent",
                        "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors"
                      )}
                    >
                      <item.icon
                        className={cn(
                          pathname === item.href || pathname.startsWith(`${item.href}/`)
                            ? "text-accent"
                            : "text-theme-muted group-hover:text-accent",
                          "h-6 w-6 shrink-0 transition-colors"
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
              <div className="border-t border-theme pt-4 space-y-3">
                {/* Theme Toggle in Sidebar */}
                <div className="px-2">
                  <ThemeToggle variant="button" />
                </div>
                
                <div className="flex items-center gap-x-3 px-2 py-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-accent">
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-theme truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-theme-muted">
                      {ROLE_LABELS[userRole]}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-red-500 hover:bg-red-500/10 transition-colors"
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

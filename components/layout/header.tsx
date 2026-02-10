"use client"

import { Bell, Menu } from "lucide-react"
import { useState } from "react"
import { ThemeToggle } from "@/components/theme"

interface HeaderProps {
  user: {
    name: string | null
    email: string
    role: string
  }
}

export function Header({ user }: HeaderProps) {
  const [, setSidebarOpen] = useState(false)

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b px-4 sm:gap-x-6 sm:px-6 lg:px-8 glass-panel">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-theme-muted lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          <button
            type="button"
            className="-m-2.5 p-2.5 text-theme-muted hover:text-theme transition-colors"
          >
            <span className="sr-only">Ver notificaciones</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="hidden lg:block lg:h-6 lg:w-px bg-theme-border opacity-30" />

          <div className="flex items-center gap-x-3">
            <span className="text-sm text-theme">
              {user.name || user.email}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

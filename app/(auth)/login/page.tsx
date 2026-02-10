"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { ThemeToggle } from "@/components/theme"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [tenantSlug, setTenantSlug] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantSlug: tenantSlug || undefined,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setError("Credenciales inválidas")
        setIsLoading(false)
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch (error) {
      console.error("Login error:", error)
      setError("Error al iniciar sesión")
      setIsLoading(false)
    }
  }

  return (
    <div className="glass-panel-strong p-8 rounded-2xl">
      <div className="flex justify-end mb-4">
        <ThemeToggle />
      </div>
      
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-theme">Farmacia ERP</h1>
        <p className="text-theme-muted mt-1">Inicie sesión en su cuenta</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-theme">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="usuario@farmacia.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-theme-panel border-theme text-theme placeholder:text-theme-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-theme">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-theme-panel border-theme text-theme placeholder:text-theme-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenant" className="text-theme">Farmacia (opcional)</Label>
          <Input
            id="tenant"
            type="text"
            placeholder="Nombre de la farmacia"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            className="bg-theme-panel border-theme text-theme placeholder:text-theme-muted"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-theme-muted">
        <p>Demo: admin@demo.cl / password</p>
      </div>
    </div>
  )
}

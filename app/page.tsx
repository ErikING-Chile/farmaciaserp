import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { ThemeToggle } from "@/components/theme"
import { Package, Shield, Wifi, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b glass-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-theme">Farmacia ERP</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" className="text-theme-muted hover:text-theme">
                  Iniciar Sesión
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-theme mb-6">
            Gestión inteligente para
            <span className="text-accent"> tu farmacia</span>
          </h1>
          <p className="text-xl text-theme-muted mb-8 max-w-3xl mx-auto">
            Sistema completo de gestión con inventario FEFO, punto de venta, 
            control de lotes y soporte offline. Diseñado específicamente para 
            farmacias en Chile.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login">
              <RainbowButton className="text-lg px-8">
                Comenzar Ahora
              </RainbowButton>
            </Link>
          </div>
          <p className="mt-4 text-sm text-theme-muted">
            Demo: admin@demo.cl / password
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="glass-panel p-6 rounded-xl">
            <div className="w-12 h-12 bg-violet-500/20 rounded-lg flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold text-theme mb-2">
              Inventario FEFO
            </h3>
            <p className="text-theme-muted">
              Control automático de lotes con fecha de vencimiento. 
              Asignación FEFO en cada venta.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-theme mb-2">
              Punto de Venta Rápido
            </h3>
            <p className="text-theme-muted">
              POS optimizado para ventas rápidas con escáner de códigos 
              de barras y búsqueda inteligente.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <div className="w-12 h-12 bg-sky-500/20 rounded-lg flex items-center justify-center mb-4">
              <Wifi className="w-6 h-6 text-sky-500" />
            </div>
            <h3 className="text-lg font-semibold text-theme mb-2">
              Funciona Offline
            </h3>
            <p className="text-theme-muted">
              Sigue vendiendo sin internet. Sincronización automática 
              cuando vuelva la conexión.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-theme mb-2">
              DTE Ready
            </h3>
            <p className="text-theme-muted">
              Preparado para facturación electrónica. Integración 
              con SII en fases.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="glass-panel-strong py-16 my-8 mx-4 sm:mx-6 lg:mx-8 rounded-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4 text-theme">
            ¿Listo para modernizar tu farmacia?
          </h2>
          <p className="text-theme-muted mb-8 text-lg">
            Prueba el demo gratis y descubre todas las funcionalidades.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 bg-accent hover:bg-accent-dark">
              Acceder al Demo
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 glass-panel mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
                <Package className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-theme">
                Farmacia ERP
              </span>
            </div>
            <p className="text-sm text-theme-muted">
              © 2026 Farmacia ERP. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

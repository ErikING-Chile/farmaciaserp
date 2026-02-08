"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Check } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { PaymentMethod } from "@prisma/client"

interface Product {
  id: string
  name: string
  sku: string
  salePrice: number
  taxRate: number
  barcode: string | null
  batches: {
    id: string
    lotNumber: string
    expirationDate: string
    remainingQty: number
  }[]
}

interface CartItem {
  productId: string
  name: string
  sku: string
  quantity: number
  unitPrice: number
  taxRate: number
  discount: number
  batches: {
    batchId: string
    quantity: number
    lotNumber: string
  }[]
}

export default function POSPage() {
  const [search, setSearch] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH)
  const [reference, setReference] = useState("")

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
    return sum + itemTotal
  }, 0)
  
  const taxAmount = cart.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
    return sum + (itemTotal * item.taxRate / 100)
  }, 0)
  
  const total = subtotal + taxAmount

  // Search products
  const handleSearch = useCallback(async () => {
    if (!search.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/products?search=${encodeURIComponent(search)}&includeStock=true`)
      const data = await response.json()
      setProducts(data.data || [])
    } catch (error) {
      console.error("Error searching products:", error)
    } finally {
      setIsLoading(false)
    }
  }, [search])

  // FEFO allocation
  const allocateBatches = (product: Product, quantity: number) => {
    const allocations: { batchId: string; quantity: number; lotNumber: string }[] = []
    let remaining = quantity

    // Sort by expiration date (FEFO)
    const sortedBatches = [...product.batches].sort(
      (a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
    )

    for (const batch of sortedBatches) {
      if (remaining <= 0) break
      
      const allocateQty = Math.min(remaining, batch.remainingQty)
      allocations.push({
        batchId: batch.id,
        quantity: allocateQty,
        lotNumber: batch.lotNumber,
      })
      remaining -= allocateQty
    }

    return { allocations, remaining }
  }

  // Add to cart
  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.productId === product.id)
    
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + 1
      const { allocations, remaining } = allocateBatches(product, newQuantity)
      
      if (remaining > 0) {
        alert(`Stock insuficiente. Solo quedan ${newQuantity - remaining} unidades disponibles.`)
        return
      }

      setCart(cart.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: newQuantity, batches: allocations }
          : item
      ))
    } else {
      // Add new item
      const { allocations, remaining } = allocateBatches(product, 1)
      
      if (remaining > 0) {
        alert("No hay stock disponible para este producto")
        return
      }

      setCart([...cart, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice: product.salePrice,
        taxRate: product.taxRate,
        discount: 0,
        batches: allocations,
      }])
    }
    
    setSearch("")
    setProducts([])
  }

  // Update quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.productId !== productId) return item
      
      const newQuantity = Math.max(1, item.quantity + delta)
      // In real app, we'd need to re-fetch product batches
      return { ...item, quantity: newQuantity }
    }))
  }

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId))
  }

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            allocations: item.batches,
          })),
          payments: [{
            method: paymentMethod,
            amount: total,
            reference: reference || undefined,
          }],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error processing sale")
      }

      const result = await response.json()
      
      // Clear cart and show success
      setCart([])
      alert(`Venta procesada exitosamente. Boleta #${result.saleNumber}`)
      
    } catch (error) {
      console.error("Error processing sale:", error)
      alert(error instanceof Error ? error.message : "Error al procesar la venta")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle barcode scan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Simple barcode detection (Enter key after numbers)
      if (e.key === "Enter" && search.match(/^\d+$/)) {
        handleSearch()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [search, handleSearch])

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Left side - Product Search */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
          <p className="text-sm text-gray-500">Escanee o busque productos</p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Escanee código de barras o escriba para buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 h-12 text-lg"
            autoFocus
          />
        </div>

        {/* Product Results */}
        {products.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden mb-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left"
              >
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatCurrency(product.salePrice)}
                  </p>
                  <p className="text-sm text-green-600">
                    {product.batches.reduce((sum, b) => sum + b.remainingQty, 0)} disponibles
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <p className="text-gray-500 text-center py-4">Buscando...</p>
        )}
      </div>

      {/* Right side - Cart */}
      <div className="w-96 bg-white rounded-lg shadow flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Carrito</h2>
            <span className="ml-auto text-sm text-gray-500">
              {cart.length} item(s)
            </span>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2" />
              <p>Carrito vacío</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="bg-gray-50 rounded-lg p-3"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.sku}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </p>
                </div>

                {/* Batch info (FEFO) */}
                <div className="mt-2 text-xs text-gray-500">
                  {item.batches.map((batch) => (
                    <span key={batch.batchId} className="inline-block mr-2">
                      Lote {batch.lotNumber}: {batch.quantity} un
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Section */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-4">
            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Impuestos</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                <span>TOTAL</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Método de Pago
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                  className={`flex items-center justify-center gap-2 p-2 rounded-md border text-sm ${
                    paymentMethod === PaymentMethod.CASH
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Efectivo
                </button>
                <button
                  onClick={() => setPaymentMethod(PaymentMethod.CARD_DEBIT)}
                  className={`flex items-center justify-center gap-2 p-2 rounded-md border text-sm ${
                    paymentMethod === PaymentMethod.CARD_DEBIT
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Débito
                </button>
                <button
                  onClick={() => setPaymentMethod(PaymentMethod.CARD_CREDIT)}
                  className={`flex items-center justify-center gap-2 p-2 rounded-md border text-sm ${
                    paymentMethod === PaymentMethod.CARD_CREDIT
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Crédito
                </button>
                <button
                  onClick={() => setPaymentMethod(PaymentMethod.TRANSFER)}
                  className={`flex items-center justify-center gap-2 p-2 rounded-md border text-sm ${
                    paymentMethod === PaymentMethod.TRANSFER
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Transferencia
                </button>
              </div>
            </div>

            {/* Reference */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Referencia / Voucher
              </label>
              <Input
                placeholder="N° de operación o voucher"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Process Button */}
            <Button
              onClick={processSale}
              disabled={isLoading}
              className="w-full h-12 text-lg"
            >
              {isLoading ? "Procesando..." : "Cobrar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

import { requireAuth } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { TaxCategory } from "@prisma/client"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

async function getCategories(tenantId: string) {
  return prisma.category.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  })
}

export default async function NewProductPage() {
  const user = await requireAuth()
  const categories = await getCategories(user.tenantId)

  async function createProduct(formData: FormData) {
    "use server"
    
    const user = await requireAuth()
    const taxCategoryValue = formData.get("taxCategory") as string | null
    const taxCategory = Object.values(TaxCategory).includes(
      taxCategoryValue as TaxCategory
    )
      ? (taxCategoryValue as TaxCategory)
      : TaxCategory.STANDARD
    
    const data = {
      sku: formData.get("sku") as string,
      name: formData.get("name") as string,
      brand: formData.get("brand") as string || null,
      description: formData.get("description") as string || null,
      unit: formData.get("unit") as string,
      taxCategory,
      barcode: formData.get("barcode") as string || null,
      supplierCode: formData.get("supplierCode") as string || null,
      minStock: parseInt(formData.get("minStock") as string) || 0,
      maxStock: parseInt(formData.get("maxStock") as string) || null,
      reorderPoint: parseInt(formData.get("reorderPoint") as string) || 10,
      baseCost: parseFloat(formData.get("baseCost") as string) || 0,
      salePrice: parseFloat(formData.get("salePrice") as string) || 0,
      categoryId: formData.get("categoryId") as string || null,
      tenantId: user.tenantId,
    }

    await prisma.product.create({ data })
    
    redirect("/products")
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Producto</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ingrese los datos del nuevo producto
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 max-w-4xl">
        <form action={createProduct} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                name="sku"
                required
                placeholder="Ej: MED-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Nombre del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                name="brand"
                placeholder="Marca del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoría</Label>
              <select
                id="categoryId"
                name="categoryId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                name="barcode"
                placeholder="EAN/UPC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierCode">Código de Proveedor</Label>
              <Input
                id="supplierCode"
                name="supplierCode"
                placeholder="Código interno del proveedor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidad</Label>
              <select
                id="unit"
                name="unit"
                defaultValue="UN"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="UN">Unidad</option>
                <option value="BOX">Caja</option>
                <option value="BLISTER">Blister</option>
                <option value="PACK">Pack</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxCategory">Categoría Tributaria</Label>
              <select
                id="taxCategory"
                name="taxCategory"
                defaultValue="STANDARD"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="STANDARD">Standard (19% IVA)</option>
                <option value="EXEMPT">Exento</option>
                <option value="REDUCED">Reducido</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseCost">Costo Base ($)</Label>
              <Input
                id="baseCost"
                name="baseCost"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salePrice">Precio Venta ($)</Label>
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock">Stock Mínimo</Label>
              <Input
                id="minStock"
                name="minStock"
                type="number"
                min="0"
                defaultValue="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxStock">Stock Máximo</Label>
              <Input
                id="maxStock"
                name="maxStock"
                type="number"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Punto de Reorden</Label>
              <Input
                id="reorderPoint"
                name="reorderPoint"
                type="number"
                min="0"
                defaultValue="10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              placeholder="Descripción del producto..."
            />
          </div>

          <div className="flex justify-end gap-4">
            <Link href="/products">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit">
              Crear Producto
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

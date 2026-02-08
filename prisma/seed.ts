import { PrismaClient, UserRole, MovementType, PurchaseStatus, SaleStatus, PaymentMethod, PaymentStatus, TaxCategory } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Create tenant (Farmacia Demo)
  const tenant = await prisma.tenant.create({
    data: {
      name: "Farmacia Demo",
      slug: "demo",
      rut: "76.123.456-7",
      isActive: true,
      settings: {
        address: "Av. Demo 123, Santiago",
        phone: "+56 2 2345 6789",
        email: "contacto@farmaciasdemo.cl",
      },
      featureFlags: {
        enableDte: false,
        enableWebpay: false,
        enableOffline: true,
      },
    },
  })

  console.log(`✅ Created tenant: ${tenant.name}`)

  // Create branches
  const mainBranch = await prisma.branch.create({
    data: {
      name: "Sucursal Principal",
      address: "Av. Principal 123, Santiago",
      phone: "+56 2 2345 6789",
      tenantId: tenant.id,
    },
  })

  const secondaryBranch = await prisma.branch.create({
    data: {
      name: "Sucursal Centro",
      address: "Calle Centro 456, Santiago",
      phone: "+56 2 2345 6790",
      tenantId: tenant.id,
    },
  })

  console.log(`✅ Created branches: ${mainBranch.name}, ${secondaryBranch.name}`)

  // Create warehouses
  const mainWarehouse = await prisma.warehouse.create({
    data: {
      name: "Bodega Principal",
      type: "MAIN",
      branchId: mainBranch.id,
      tenantId: tenant.id,
    },
  })

  console.log(`✅ Created warehouse: ${mainWarehouse.name}`)

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: "Medicamentos", tenantId: tenant.id },
    }),
    prisma.category.create({
      data: { name: "Suplementos", tenantId: tenant.id },
    }),
    prisma.category.create({
      data: { name: "Cuidado Personal", tenantId: tenant.id },
    }),
    prisma.category.create({
      data: { name: "Bebés", tenantId: tenant.id },
    }),
  ])

  console.log(`✅ Created ${categories.length} categories`)

  // Create users
  const hashedPassword = await bcrypt.hash("password", 10)

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@demo.cl",
        name: "Administrador",
        password: hashedPassword,
        role: UserRole.ADMIN,
        tenantId: tenant.id,
        branchId: mainBranch.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "vendedor@demo.cl",
        name: "Vendedor Demo",
        password: hashedPassword,
        role: UserRole.SELLER,
        tenantId: tenant.id,
        branchId: mainBranch.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "bodega@demo.cl",
        name: "Bodeguero Demo",
        password: hashedPassword,
        role: UserRole.WAREHOUSE,
        tenantId: tenant.id,
        branchId: mainBranch.id,
        isActive: true,
      },
    }),
  ])

  console.log(`✅ Created ${users.length} users`)
  console.log("   - admin@demo.cl / password (Admin)")
  console.log("   - vendedor@demo.cl / password (Vendedor)")
  console.log("   - bodega@demo.cl / password (Bodeguero)")

  // Create suppliers
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "Laboratorio Chile",
        rut: "96.123.456-7",
        contactName: "Juan Pérez",
        email: "ventas@laboratoriochile.cl",
        phone: "+56 2 2345 6789",
        tenantId: tenant.id,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Distribuidora Farmacéutica SA",
        rut: "96.987.654-3",
        contactName: "María González",
        email: "contacto@disfarm.cl",
        phone: "+56 2 3456 7890",
        tenantId: tenant.id,
      },
    }),
  ])

  console.log(`✅ Created ${suppliers.length} suppliers`)

  // Create sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "MED-001",
        name: "Paracetamol 500mg x 20 comprimidos",
        brand: "Genérico",
        unit: "UN",
        taxCategory: TaxCategory.STANDARD,
        barcode: "7800000000001",
        minStock: 20,
        reorderPoint: 30,
        baseCost: 1500,
        salePrice: 2490,
        categoryId: categories[0].id,
        tenantId: tenant.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: "MED-002",
        name: "Ibuprofeno 400mg x 30 comprimidos",
        brand: "Genérico",
        unit: "UN",
        taxCategory: TaxCategory.STANDARD,
        barcode: "7800000000002",
        minStock: 15,
        reorderPoint: 25,
        baseCost: 2000,
        salePrice: 3490,
        categoryId: categories[0].id,
        tenantId: tenant.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SUP-001",
        name: "Vitamina C 1000mg x 60 cápsulas",
        brand: "Nature's Bounty",
        unit: "UN",
        taxCategory: TaxCategory.STANDARD,
        barcode: "7800000000003",
        minStock: 10,
        reorderPoint: 20,
        baseCost: 8000,
        salePrice: 12990,
        categoryId: categories[1].id,
        tenantId: tenant.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: "CP-001",
        name: "Shampoo Hidratante 400ml",
        brand: "Dove",
        unit: "UN",
        taxCategory: TaxCategory.STANDARD,
        barcode: "7800000000004",
        minStock: 12,
        reorderPoint: 20,
        baseCost: 3500,
        salePrice: 5490,
        categoryId: categories[2].id,
        tenantId: tenant.id,
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        sku: "BAB-001",
        name: "Pañales Talla M x 40 unidades",
        brand: "Huggies",
        unit: "UN",
        taxCategory: TaxCategory.STANDARD,
        barcode: "7800000000005",
        minStock: 15,
        reorderPoint: 25,
        baseCost: 12000,
        salePrice: 18990,
        categoryId: categories[3].id,
        tenantId: tenant.id,
        isActive: true,
      },
    }),
  ])

  console.log(`✅ Created ${products.length} products`)

  // Create batches for products
  const expirationDate = new Date()
  expirationDate.setFullYear(expirationDate.getFullYear() + 1)

  const batches = await Promise.all([
    // Paracetamol batches
    prisma.batch.create({
      data: {
        lotNumber: "L2401001",
        expirationDate,
        initialQty: 100,
        remainingQty: 85,
        unitCost: 1500,
        productId: products[0].id,
        tenantId: tenant.id,
      },
    }),
    prisma.batch.create({
      data: {
        lotNumber: "L2402001",
        expirationDate: new Date(expirationDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        initialQty: 100,
        remainingQty: 100,
        unitCost: 1500,
        productId: products[0].id,
        tenantId: tenant.id,
      },
    }),
    // Ibuprofeno batch
    prisma.batch.create({
      data: {
        lotNumber: "L2403001",
        expirationDate,
        initialQty: 80,
        remainingQty: 75,
        unitCost: 2000,
        productId: products[1].id,
        tenantId: tenant.id,
      },
    }),
    // Vitamina C batch
    prisma.batch.create({
      data: {
        lotNumber: "L2404001",
        expirationDate: new Date(expirationDate.getTime() + 60 * 24 * 60 * 60 * 1000),
        initialQty: 50,
        remainingQty: 48,
        unitCost: 8000,
        productId: products[2].id,
        tenantId: tenant.id,
      },
    }),
  ])

  console.log(`✅ Created ${batches.length} batches`)

  // Create initial stock movements
  await Promise.all(
    batches.map((batch) =>
      prisma.stockMovement.create({
        data: {
          type: MovementType.IN,
          quantity: batch.initialQty,
          unitCost: batch.unitCost,
          tenantId: tenant.id,
          branchId: mainBranch.id,
          warehouseId: mainWarehouse.id,
          productId: batch.productId,
          batchId: batch.id,
          refType: "INITIAL",
          createdBy: users[0].id,
        },
      })
    )
  )

  console.log(`✅ Created initial stock movements`)

  // Create a sample purchase invoice
  const purchaseInvoice = await prisma.purchaseInvoice.create({
    data: {
      invoiceNumber: "123456",
      invoiceDate: new Date(),
      netAmount: 100000,
      taxAmount: 19000,
      totalAmount: 119000,
      status: PurchaseStatus.RECEIVED,
      tenantId: tenant.id,
      supplierId: suppliers[0].id,
      items: {
        create: [
          {
            quantity: 100,
            unitCost: 1500,
            discount: 0,
            total: 150000,
            batchLotNumber: "L2401001",
            productId: products[0].id,
            tenantId: tenant.id,
          },
        ],
      },
    },
  })

  console.log(`✅ Created sample purchase invoice: ${purchaseInvoice.invoiceNumber}`)

  // Create sample sale
  const sale = await prisma.sale.create({
    data: {
      saleNumber: "00000001",
      subtotal: 4980,
      taxAmount: 946,
      total: 5926,
      status: SaleStatus.PAID,
      tenantId: tenant.id,
      branchId: mainBranch.id,
      sellerId: users[1].id,
      items: {
        create: [
          {
            quantity: 2,
            unitPrice: 2490,
            discount: 0,
            taxRate: 19,
            total: 5926,
            productId: products[0].id,
            allocations: {
              create: [
                {
                  batchId: batches[0].id,
                  quantity: 2,
                },
              ],
            },
          },
        ],
      },
      payments: {
        create: [
          {
            method: PaymentMethod.CASH,
            amount: 6000,
            status: PaymentStatus.COMPLETED,
          },
        ],
      },
    },
  })

  console.log(`✅ Created sample sale: ${sale.saleNumber}`)

  // Update batch remaining quantity
  await prisma.batch.update({
    where: { id: batches[0].id },
    data: { remainingQty: { decrement: 2 } },
  })

  // Create stock movement for sale
  await prisma.stockMovement.create({
    data: {
      type: MovementType.OUT,
      quantity: 2,
      tenantId: tenant.id,
      branchId: mainBranch.id,
      warehouseId: mainWarehouse.id,
      productId: products[0].id,
      batchId: batches[0].id,
      refType: "SALE",
      refId: sale.id,
      createdBy: users[1].id,
    },
  })

  console.log(`\n✨ Seed completed successfully!`)
  console.log(`\n📋 Login credentials:`)
  console.log(`   Admin: admin@demo.cl / password`)
  console.log(`   Seller: vendedor@demo.cl / password`)
  console.log(`   Warehouse: bodega@demo.cl / password`)
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
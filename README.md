# Farmacia ERP

SaaS multi-tenant para gestión de farmacias en Chile. Sistema completo con inventario por lotes/vencimientos (FEFO), punto de venta (POS), facturación electrónica (DTE) y soporte offline (PWA).

## Características

- **Multi-tenant**: Datos aislados por farmacia
- **Multi-sucursal**: Gestión de múltiples sucursales y bodegas
- **Inventario FEFO**: Asignación automática por fecha de vencimiento
- **Lotes**: Control completo de lotes con fechas de vencimiento
- **POS**: Punto de venta rápido con búsqueda por código de barras
- **Offline-first**: PWA con IndexedDB para operación sin internet
- **DTE**: Preparado para integración con SII (fases)
- **Reportes**: Ventas, stock, vencimientos
- **Alertas**: Stock bajo y productos por vencer
- **Auditoría**: Registro de todas las operaciones críticas

## Stack Tecnológico

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Colas**: Redis + BullMQ
- **Auth**: NextAuth.js v5
- **Offline**: Dexie (IndexedDB) + Service Workers
- **Testing**: Vitest + Playwright

## Requisitos

- Node.js 18+
- Docker & Docker Compose
- Git

## Instalación

### 1. Clonar y entrar al directorio

```bash
git clone <repo-url>
cd farmacia-erp
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

### 4. Iniciar servicios (PostgreSQL + Redis)

```bash
docker-compose up -d
```

### 5. Configurar base de datos

```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Cargar datos de ejemplo
npx prisma db seed
```

### 6. Iniciar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Datos de prueba

Después de ejecutar el seed, puedes iniciar sesión con:

- **Admin**: admin@demo.cl / password
- **Vendedor**: vendedor@demo.cl / password
- **Bodeguero**: bodega@demo.cl / password

## Estructura del Proyecto

```
farmacia-erp/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rutas de autenticación
│   ├── (dashboard)/              # Rutas del dashboard
│   │   ├── dashboard/            # Dashboard principal
│   │   ├── products/             # Gestión de productos
│   │   ├── suppliers/            # Proveedores
│   │   ├── purchases/            # Compras y recepción
│   │   ├── inventory/            # Inventario y stock
│   │   ├── pos/                  # Punto de venta
│   │   ├── reports/              # Reportes
│   │   └── settings/             # Configuración
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Autenticación
│   │   ├── products/             # API de productos
│   │   ├── pos/                  # API de ventas
│   │   └── sync/                 # Sincronización offline
│   └── layout.tsx                # Layout raíz
├── components/                   # Componentes React
│   ├── ui/                       # Componentes UI base
│   └── layout/                   # Layouts compartidos
├── lib/                          # Utilidades y configuración
│   ├── auth.ts                   # Configuración NextAuth
│   ├── prisma.ts                 # Cliente Prisma
│   ├── offline-db.ts             # IndexedDB (Dexie)
│   └── utils.ts                  # Utilidades
├── prisma/                       # Esquema y migraciones
│   ├── schema.prisma             # Esquema de base de datos
│   └── seed.ts                   # Datos de prueba
├── types/                        # Tipos TypeScript
├── public/                       # Archivos estáticos
└── __tests__/                    # Tests
```

## Arquitectura Multi-Tenant

El sistema implementa multi-tenancy a nivel de aplicación con `tenantId` en todas las tablas:

- Cada tabla tiene un campo `tenantId` que referencia al tenant
- Todas las consultas incluyen el `tenantId` del usuario autenticado
- Row Level Security (RLS) puede activarse en PostgreSQL para seguridad adicional

### Modelo de Datos Principal

```
Tenant (Farmacia)
├── Branches (Sucursales)
├── Warehouses (Bodegas)
├── Users (Usuarios con roles)
├── Products (Productos)
├── Suppliers (Proveedores)
├── PurchaseInvoices (Facturas de compra)
├── Sales (Ventas)
├── Batches (Lotes)
├── StockMovements (Movimientos de inventario)
└── DteDocuments (Documentos tributarios)
```

## Inventario FEFO (First Expired, First Out)

El sistema implementa FEFO automático:

1. Al vender, se asignan unidades de los lotes con vencimiento más próximo
2. Se registra la asignación específica de cada lote
3. El stock se descuenta automáticamente de los lotes asignados
4. Se genera auditoría de todos los movimientos

## Soporte Offline (PWA)

La aplicación funciona como PWA con:

- **IndexedDB**: Almacenamiento local de productos y ventas
- **Sync automático**: Cuando vuelve la conexión, se sincronizan las operaciones
- **Idempotency keys**: Previene duplicación de ventas
- **Conflict resolution**: Ventas con conflicto de stock se marcan para revisión

### Flujo Offline

1. Usuario escanea productos y crea venta sin internet
2. Venta se guarda en IndexedDB con estado "pending"
3. Al detectar conexión, se intenta sincronizar
4. Si hay éxito: venta marcada como "synced"
5. Si hay error: venta marcada como "error" para revisión manual

## Documentos Tributarios Electrónicos (DTE)

El sistema está preparado para DTE con capas:

### Fase 1 (MVP - Actual)
- Registro manual de folios
- Generación de representación gráfica (PDF/QR)
- Estado de documentos: PENDING → MANUAL

### Fase 2
- Integración con API SII
- Emisión electrónica real
- Consulta de estado
- Colas de procesamiento con BullMQ

### Fase 3
- Integración con proveedores certificados
- Firma electrónica avanzada
- Envío automático al SII

## Roles y Permisos

| Rol | Descripción | Acceso Principal |
|-----|-------------|------------------|
| **ADMIN** | Administrador | Acceso total |
| **MANAGER** | Gerente | Gestión completa excepto configuración avanzada |
| **WAREHOUSE** | Bodeguero | Inventario, recepciones, transferencias |
| **SELLER** | Vendedor | POS, consulta de productos y stock |
| **ACCOUNTANT** | Contador | Reportes, DTE, compras |
| **AUDITOR** | Auditor | Solo lectura de todo |

## Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo
npm run build            # Build de producción
npm run start            # Iniciar servidor de producción

# Base de datos
npm run db:migrate       # Ejecutar migraciones
npm run db:seed          # Cargar datos de prueba
npm run db:reset         # Resetear base de datos
npm run db:studio        # Abrir Prisma Studio

# Testing
npm run test             # Ejecutar tests unitarios
npm run test:e2e         # Ejecutar tests E2E con Playwright
npm run test:coverage    # Tests con cobertura

# Linting
npm run lint             # Ejecutar ESLint
npm run lint:fix         # Corregir problemas de ESLint
npm run typecheck        # Verificar tipos TypeScript
```

## Testing

### Tests Unitarios

```bash
npm run test
```

Tests clave:
- FEFO allocation logic
- Inventory calculations
- Sync idempotency
- Permission checks

### Tests E2E

```bash
# Instalar navegadores de Playwright
npx playwright install

# Ejecutar tests
npm run test:e2e
```

Scenarios:
- Flujo completo de venta
- Recepción de compra con lotes
- Sincronización offline
- Cambio de sucursal

## Deployment

### Docker (Recomendado)

```bash
# Build de imagen
docker build -t farmacia-erp .

# Ejecutar
docker run -p 3000:3000 --env-file .env farmacia-erp
```

### Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configurar variables de entorno en Vercel Dashboard.

### Variables de Entorno Requeridas

```env
# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# Auth
NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="tu-secret-key"

# App
NODE_ENV="production"
APP_NAME="Farmacia ERP"

# Opcional - Fase 2
SII_API_URL=""
SII_CERT_PATH=""
SII_CERT_PASSWORD=""

# Opcional - Fase 3
TRANSBANK_COMMERCE_CODE=""
TRANSBANK_API_KEY=""
```

## Roadmap

### Fase 1 (MVP) ✅
- [x] Autenticación multi-tenant
- [x] Productos y categorías
- [x] Proveedores
- [x] Compras con lotes
- [x] Inventario FEFO
- [x] POS con búsqueda
- [x] Pagos (efectivo/tarjeta/transferencia)
- [x] Alertas básicas
- [x] PWA offline básico

### Fase 2
- [ ] Importación XML facturas
- [ ] Integración API SII (DTE)
- [ ] Reportes avanzados
- [ ] Webpay Plus (online)
- [ ] Notificaciones push
- [ ] App móvil (PWA mejorado)

### Fase 3
- [ ] Integración POS físico
- [ ] Dashboard analítico
- [ ] API pública
- [ ] Marketplace de integraciones
- [ ] Mobile app nativa

## Contribución

1. Fork el repositorio
2. Crear feature branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Agregar nueva funcionalidad'`
4. Push a branch: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## Decisiones de Arquitectura

### ¿Por qué Next.js API Routes en lugar de NestJS?

- **Simplicidad**: Menos código boilerplate para un equipo pequeño
- **Deployment**: Más fácil deployar en Vercel u otros servicios
- **Full-stack**: Un solo proyecto facilita el desarrollo
- **Escalabilidad**: Si se necesita separar, las API routes son fáciles de extraer

### ¿Por qué tenantId por tabla en lugar de schemas separados?

- **Simplicidad**: No requiere cambios complejos en Prisma
- **Performance**: Un solo pool de conexiones
- **Mantenimiento**: Migraciones más simples
- **Query optimization**: Facilita JOINs entre entidades

### ¿Por qué Dexie en lugar de localStorage?

- **Capacidad**: IndexedDB soporta GBs de datos
- **Estructura**: Soporta índices y queries complejas
- **Performance**: Asíncrono y no bloquea el UI
- **Sync**: Mejor manejo de transacciones

## Soporte

Para reportar issues o solicitar funcionalidades:

- GitHub Issues: [URL del repo]/issues
- Email: soporte@farmaciaerp.cl

## Licencia

MIT License - Ver LICENSE para más detalles

---

**Desarrollado con ❤️ para farmacias de Chile**
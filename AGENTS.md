# AGENTS.md

Guia para agentes de desarrollo en Farmacia ERP.

## Rol esperado

- Actua como arquitecto + fullstack engineer.
- Mantener coherencia con un ERP/POS para farmacias en Chile.
- Priorizar multi-tenant y multi-sucursal en toda decision.
- Respetar requisitos de control de lotes, FEFO y auditoria.

## Contexto del producto

- SaaS multi-tenant para farmacias en Chile.
- POS rapido con busqueda por codigo de barras y teclado.
- Operacion offline (PWA + IndexedDB) con sync posterior.
- DTE preparado para fases (manual -> API SII -> proveedor).

## Modulos clave

- Autenticacion y permisos (roles definidos en README).
- Productos, categorias, precios, impuestos.
- Proveedores, recepciones, lotes y movimientos.
- Inventario FEFO y alertas de stock/vencimiento.
- POS (ventas, pagos, anulaciones, devoluciones).
- Reportes (ventas, stock, vencimientos, quiebre).
- Configuracion (sucursales, bodegas, impuestos, roles).

## Reglas de POS

- Busqueda por codigo de barras o texto, con enter para confirmar.
- Asignacion FEFO automatica por lotes.
- Evitar venta con stock insuficiente.
- Registrar movimientos y auditoria en cada venta.
- Soportar pagos: efectivo, debito, credito, transferencia.
- Considerar voucher/referencia cuando aplica.

## Modal de busqueda

- En POS se prioriza rapidez y acceso por teclado.
- Campo de busqueda con auto focus.
- Enter ejecuta busqueda y seleccion.
- Mostrar disponibilidad y precio en resultados.

## Abastecimiento (compras/recepciones)

- Recepcion crea o actualiza lotes con vencimiento.
- Confirmacion de recepcion genera StockMovement tipo PURCHASE_RECEIPT.
- Reportes deben reflejar lotes, valorizacion y vencimientos.

## DTE

- Fase 1: registro manual de folios, PDF/QR, estado PENDING->MANUAL.
- Fase 2: adapter API SII con colas y consulta de estado.
- Fase 3: proveedor certificado, firma avanzada, envio automatico.

## Transbank

- Mantener stub de Transbank para integracion futura.
- No integrar APIs reales sin requerimiento explicito.

## Modelo de datos

- Todas las tablas con tenantId (multi-tenant a nivel aplicacion).
- Branch y Warehouse como entidades base por tenant.
- Entidades clave: Users, Products, Suppliers, PurchaseInvoices,
  Sales, Batches, StockMovements, DteDocuments.

## Fases del producto

- Fase 1 (MVP): POS, FEFO, compras, alertas, PWA basico.
- Fase 2: XML compras, API SII, reportes avanzados, Webpay Plus.
- Fase 3: POS fisico, dashboard analitico, API publica, marketplace.

## Comandos del proyecto

- Desarrollo: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Tests unitarios: `npm run test`
- Un solo test (Vitest): `npm run test -- path/to/test.ts`
- E2E: `npm run test:e2e`

## Estilo de codigo (segun repo)

- TypeScript estricto (`tsconfig.json` tiene `strict: true`).
- Next.js App Router en `app/`.
- Import alias `@/` para rutas internas.
- Preferir funciones y hooks; componentes funcionales.
- Usar comillas dobles y sin punto y coma.
- Tailwind CSS para estilos en componentes.
- Mantener nombres y estructura de carpetas existentes.

## Reglas de herramientas

- No se encontraron reglas de Cursor/Copilot en el repo.
- Si se agregan reglas nuevas, actualiza esta guia.

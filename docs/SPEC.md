# Beauty Suite — Especificación de Arquitectura (fuente única de verdad)

> **Este documento es la fuente única de verdad de la arquitectura. Se lee antes de escribir código.**
> Objetivo: una plataforma SaaS **multi-tenant** de gestión integral para centros de belleza
> (uñas, peluquería, estética, barbería). Primer tenant activo: **Estudio Aurora**.
> Marca blanca por configuración (logo, colores, dominio, datos). 
---

## 0. Reglas de oro (coherencia)

1. **No inventes convenciones nuevas.** Copia el patrón del módulo de referencia (`auth`, `tenants`).
2. **Propiedad de ficheros disjunta.** Cada tarea toca SOLO las rutas que tiene asignadas.
   NO edites ficheros compartidos (`app.module.ts`, `prisma/schema.prisma`, `package.json` raíz,
   `turbo.json`, `tailwind.config`, ficheros de navegación) salvo que sea tu tarea explícita.
   El wiring central se hace en una fase de integración separada.
3. **TypeScript `strict` en todo.** Nada de `any` implícito. DTOs validados. Sin `console.log` en
   producción (usar el logger). Sin secretos hardcodeados.
4. **Multi-tenant siempre.** Toda entidad de negocio lleva `tenantId`. Toda query se filtra por tenant.
5. **Idempotencia de scaffolding.** Si un fichero ya existe y es correcto, no lo dupliques.
6. Idioma de la UI y textos de cara al usuario: **Español (es-ES)**. Código, identificadores y
   comentarios técnicos en inglés. Mantén tildes y `ñ` correctas en textos de UI.

---

## 1. Stack técnico (versiones objetivo)

- **Monorepo:** pnpm workspaces + Turborepo. Node 22, pnpm 10.
- **Backend (`apps/api`):** NestJS 10, TypeScript 5.5+, Prisma 5 + PostgreSQL 16, Redis 7
  (caché + colas BullMQ para recordatorios/emails), Passport-JWT (access 15m + refresh 7d con
  rotación, cookies httpOnly), `argon2` para hash de contraseñas, `class-validator`/`class-transformer`,
  `@nestjs/config` con validación `zod`, `@nestjs/swagger` (OpenAPI), `nestjs-pino` (logs),
  `helmet`, `@nestjs/throttler` (rate-limit), Stripe (suscripciones + pagos), `nodemailer`.
  Tests: Jest (unit) + Supertest (e2e).
- **Frontend (`apps/web`):** Next.js 15 App Router (React 19), TypeScript, TailwindCSS 3 con theming
  por CSS variables, componentes estilo shadcn/ui (Radix), TanStack Query (estado servidor),
  Zustand (estado cliente ligero), react-hook-form + zod, next-intl (i18n, es por defecto),
  framer-motion (animaciones), Recharts (gráficas), `@fullcalendar/*` o `dnd-kit` (agenda),
  `next/font` para las tipografías. Auth vía cookies httpOnly proxeadas por Route Handlers (BFF) → API Nest.
- **Infra:** Docker multi-stage (api, web), docker-compose (postgres, redis, api, web, mailhog),
  GitHub Actions CI (lint, typecheck, test, build), `.env.example`, healthchecks.

---

## 2. Estructura del monorepo (mapa de propiedad de ficheros)

```
PROJECT_ROOT/
├─ package.json                 # raíz (workspaces, scripts turbo)  [FASE ROOT]
├─ pnpm-workspace.yaml          # [FASE ROOT]
├─ turbo.json                   # [FASE ROOT]
├─ tsconfig.base.json           # [FASE ROOT]
├─ .env.example .gitignore .editorconfig .prettierrc .nvmrc  [FASE ROOT]
├─ docker-compose.yml           # [FASE INFRA]
├─ .github/workflows/ci.yml     # [FASE INFRA]
├─ README.md                    # [FASE INFRA/ROOT]
├─ docs/                        # SPEC.md, requisitos, ADRs
├─ assets/brand/                # logo del cliente (ya presente)
├─ packages/
│  ├─ config-ts/                # tsconfig compartidos          [FASE ROOT]
│  ├─ eslint-config/            # reglas eslint compartidas     [FASE ROOT]
│  ├─ types/                    # tipos/DTO compartidos api↔web [FASE ROOT/CORES]
│  ├─ ui/                       # design system React (botones, inputs, cards, tema)  [FASE web-core]
│  └─ theme/                    # tokens de marca (paleta, fuentes) consumidos por web y ui  [FASE ROOT]
└─ apps/
   ├─ api/                      # NestJS
   │  ├─ prisma/schema.prisma   # TODAS las entidades (una sola fuente)  [FASE api-core]
   │  ├─ prisma/seed.ts         # seed Aurora + plataforma                [FASE integración]
   │  └─ src/
   │     ├─ main.ts app.module.ts                       [api-core + integración]
   │     ├─ config/             # env zod, config service  [api-core]
   │     ├─ prisma/             # PrismaModule + PrismaService (+ tenant extension)  [api-core]
   │     ├─ common/             # filters, interceptors, guards base, decorators, dto paginación  [api-core]
   │     ├─ auth/               # login, refresh, guards JWT, RBAC  [api-core]  ← REFERENCIA
   │     ├─ tenancy/            # resolución de tenant, TenantContext, guard  [api-core]  ← REFERENCIA
   │     └─ modules/<dominio>/  # un dominio por carpeta (fan-out)  [FASE módulos]
   └─ web/                      # Next.js
      ├─ next.config.ts tailwind.config.ts postcss  [web-core]
      ├─ src/app/               # rutas App Router (fan-out por área)
      ├─ src/components/        # componentes compartidos  [web-core]
      ├─ src/lib/               # api client, auth, query client, utils  [web-core]
      └─ src/styles/globals.css # CSS vars del tema  [web-core]
```

**Regla de wiring:** los módulos backend se registran en `app.module.ts` y el frontend en su
navegación **solo** en la fase de integración, para evitar colisiones.

---

## 3. Multi-tenancy

- Estrategia: **shared database, shared schema** con columna `tenantId` en toda entidad de negocio.
- `Tenant` = salón. `User` con `role` y `tenantId` (nullable solo para `SUPERADMIN` de plataforma).
- Resolución del tenant (orden): 1) header `X-Tenant` (dev), 2) subdominio (`aurora.fgdbeauty.app`),
  3) dominio propio mapeado. Se expone `TenantContext` (request-scoped) con `tenantId`.
- `PrismaService` aplica un **extension/middleware** que inyecta y fuerza `tenantId` en lecturas y
  escrituras de modelos tenant-scoped, evitando fugas entre salones. Superadmin puede bypass explícito.
- Theming/branding por tenant en `Tenant.brand` (JSON: colors, logoUrl, fonts, socials) → el frontend
  lo lee para pintar marca blanca.

## 4. Auth y RBAC

- Roles: `SUPERADMIN` (plataforma FGD), `OWNER` (dueña salón), `MANAGER`, `EMPLOYEE`, `CLIENT`.
- JWT access (15m) + refresh (7d, rotación + `RefreshToken` hasheado en BD, revocación). Cookies
  httpOnly `Secure` `SameSite=Lax`. Passwords con `argon2id`. Rate-limit en `/auth/*`.
- `@Roles(...)` + `RolesGuard`; `@CurrentUser()`; `JwtAuthGuard` global con `@Public()` para abrir rutas.
- Reserva pública SIN registro permitida (crea/asocia `Client` por teléfono/email; endpoints `@Public()`).

## 5. Seguridad (nivel industrial, no negociable)

- `helmet`, CORS estricto (allowlist por env), `@nestjs/throttler` global + reforzado en auth.
- `ValidationPipe` global `{ whitelist:true, forbidNonWhitelisted:true, transform:true }`.
- Sin secretos en el código; todo por env validado con zod (arranque falla si falta una var).
- Filtro de excepciones uniforme → JSON `{ statusCode, message, error, correlationId }`. Sin stack en prod.
- Logs sin PII sensible (nada de contraseñas, tokens, tarjetas). `AuditLog` para acciones sensibles.
- Idempotencia en pagos (Stripe idempotency-key). Webhooks Stripe verificados por firma.
- Cabeceras de seguridad también en Next (CSP básica, `X-Frame-Options`, etc.).

## 6. Modelo de datos (Prisma — TODAS las entidades, agrupadas)

> `api-core` implementa el schema completo. `tenantId` + índices `(tenantId, ...)` en toda entidad de
> negocio. Enums en `PascalCase`, campos `camelCase`, `createdAt/updatedAt`. Relaciones con `onDelete`
> sensato. Dinero en enteros de céntimos (`Int`) + `currency`. Fechas `DateTime` en UTC.

**Plataforma/Tenancy:** `Tenant`(slug, name, legalName, brand Json, domain?, planKey, status, timezone,
locale, currency, contacto), `Plan`(key STARTER/PROFESSIONAL/BUSINESS/ENTERPRISE, name, priceMonthly,
features Json, moduleFlags Json), `Subscription`(tenantId, planKey, status, stripeSubscriptionId,
currentPeriodEnd, trialEnd), `ModuleActivation`(tenantId, moduleKey, enabled), `SupportTicket`(tenantId,
subject, description, status, priority, createdById), `AuditLog`(tenantId?, actorId?, action, entity,
entityId, meta Json).

**Identidad:** `User`(tenantId?, email, passwordHash, role, status, name, phone), `RefreshToken`(userId,
tokenHash, expiresAt, userAgent, ip, revokedAt).

**CRM:** `Client`(tenantId, userId?, name, phone, email?, instagram?, birthDate?, photoUrl?, allergies?,
preferences?, favoriteColors?, notes?, loyaltyPoints), `ClientPhoto`(clientId, url, kind
BEFORE/AFTER/DESIGN, bookingId?).

**Catálogo:** `ServiceCategory`(tenantId, name, sortOrder), `Service`(tenantId, categoryId, name,
description, durationMin, price, active, imageUrl?).

**Agenda/Reservas:** `Booking`(tenantId, clientId, employeeId?, serviceId, startAt, endAt, status
PENDING/CONFIRMED/COMPLETED/CANCELLED/NO_SHOW, source PUBLIC/PORTAL/ADMIN, price, notes?),
`WaitlistEntry`(tenantId, clientId, serviceId, desiredDate, status), `WorkingHours`(tenantId, employeeId?,
weekday, startTime, endTime), `TimeOff`(tenantId, employeeId, startAt, endAt, kind, status).

**Fidelización/Marketing comercial:** `LoyaltyCard`(tenantId, clientId, stamps, freeEarned, redeemedCount),
`LoyaltyTransaction`(cardId, bookingId?, delta, reason), `Voucher`(bono: tenantId, clientId, serviceId,
totalSessions, usedSessions, price, expiresAt, status), `GiftCard`(tenantId, code, initialAmount, balance,
purchasedByClientId?, redeemedByClientId?, status, expiresAt?), `Promotion`(tenantId, name, kind
PERCENT/FIXED, value, conditions Json, startAt, endAt, active), `Coupon`(tenantId, code, promotionId,
maxRedemptions, usedCount, perClientLimit), `Referral`(tenantId, referrerClientId, referredClientId,
rewardStatus).

**Caja/Pagos:** `Payment`(tenantId, clientId?, bookingId?, orderId?, amount, currency, method
CASH/CARD/TRANSFER/STRIPE/GIFTCARD/VOUCHER, status, stripePaymentIntentId?), `Invoice`(tenantId, clientId?,
number, items Json, subtotal, tax, total, status, pdfUrl?, issuedAt), `Expense`(tenantId, category, amount,
description, date, supplierId?), `CashSession`(tenantId, openedById, openingFloat, closingAmount?,
expectedAmount?, difference?, openedAt, closedAt?, status).

**Inventario/Tienda:** `Supplier`(tenantId, name, contact?, email?, phone?), `Product`(tenantId, sku, name,
description?, category?, price, cost?, stock, lowStockThreshold, supplierId?, imageUrl?, active,
isStoreItem), `StockMovement`(tenantId, productId, kind IN/OUT/ADJUST, quantity, reason, bookingId?),
`Order`(tenantId, clientId?, subtotal, shipping, total, status, paymentId?, shippingAddress Json?),
`OrderItem`(orderId, productId, quantity, unitPrice).

**Empleados:** `Employee`(tenantId, userId?, name, title?, phone?, email?, photoUrl?, color, commissionRate?,
salary?, hireDate?, active, bookable, bio?, specialties?), `Commission`(tenantId, employeeId, bookingId?,
orderId?, amount, period, status).

**Academia/LMS:** `Course`(tenantId, title, description, kind PRESENTIAL/ONLINE/LIVE, price, coverUrl?,
published), `CourseModule`(courseId, title, sortOrder), `Lesson`(moduleId, title, contentType VIDEO/PDF/TEXT,
videoUrl?, pdfUrl?, durationMin?, sortOrder, freePreview), `Enrollment`(tenantId, courseId, userId,
status, progressPct, certificateUrl?, startedAt?, completedAt?), `LessonProgress`(enrollmentId, lessonId,
completed, watchedSec), `Exam`(courseId, title, passScore), `ExamQuestion`(examId, text, options Json,
correctIndex), `ExamAttempt`(enrollmentId, examId, score, passed), `CourseSession`(courseId, startAt, endAt,
capacity, seatsTaken, meetingUrl?), `Certificate`(enrollmentId, code, url, issuedAt).

**Notificaciones/Contenido público:** `Campaign`(tenantId, channel EMAIL/SMS/WHATSAPP, subject?, body,
audienceFilter Json?, scheduledAt?, status), `Notification`(tenantId, userId, type, title, body, read,
data Json?), `MessageTemplate`(tenantId, channel, key, subject?, body), `BlogPost`(tenantId, slug, title,
excerpt?, coverUrl?, contentMdx, tags String[], published, publishedAt?, authorId?), `GalleryItem`(tenantId,
url, category?, isBeforeAfter, beforeUrl?, afterUrl?, caption?, sortOrder), `Testimonial`(tenantId,
clientName, rating, text, avatarUrl?, approved), `Setting`(tenantId, key, valueJson).

**IA (premium):** `AiSuggestion`(tenantId, clientId?, type, input Json, output Json).

## 7. Dominios de negocio (carpetas en `apps/api/src/modules/` — fan-out)

`tenants` · `plans-billing` · `users` · `clients`(CRM) · `catalog`(servicios) · `bookings`(agenda,
waitlist, horarios) · `loyalty`(tarjetas, bonos, gift cards) · `payments-cash`(caja, facturas, gastos) ·
`inventory`(productos, stock, proveedores) · `store`(pedidos online) · `employees`(comisiones, horarios) ·
`academy`(cursos, lecciones, matrículas, exámenes, certificados) · `marketing`(campañas, promos, cupones,
referidos) · `notifications` · `stats`(dashboards agregados) · `content`(blog, galería, testimonios) ·
`superadmin`(gestión plataforma) · `ai`(sugerencias premium).

Cada módulo: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `dto/*.dto.ts`, `*.spec.ts` mínimo.
Usa `PrismaService`, `TenantContext`, guards de auth/roles. Rutas REST versionadas `/api/v1/...`.
Swagger tags por módulo. Paginación con el DTO común.

## 8. Marca y diseño (tokens Estudio Aurora)

Estética: **elegante, femenina, premium**. Inspiración: plantilla "Nandini" (Dancing Script + cuerpo
sans, animaciones on-scroll, galería filtrable, hero). Logo en `assets/brand/logo-aurora.jpeg`
(cópialo a `apps/web/public/brand/`).

**Paleta (fucsia/magenta + tinta + neutros):**
- `brand` (magenta/fucsia): 50 `#FCE7F1`, 100 `#FBCFE3`, 200 `#F7A9CC`, 300 `#F075AE`,
  400 `#E84393`, 500 `#D6157F` (principal), 600 `#C2185B`, 700 `#9D0E4B`, 800 `#7A0B3A`,
  900 `#5A0A2C`, 950 `#3A0620`.
- `ink` (casi negro): `#141414`; `ink-soft` `#2B2B2B`.
- `neutral`: blancos/greys estándar Tailwind; fondo base `#FFFFFF` y `#FFF7FB` (tinte rosa muy sutil).
- Estado: success `#16A34A`, warning `#D97706`, danger `#DC2626`, info `#2563EB`.

**Tipografías (`next/font`):**
- Display/acento (logo, títulos hero): **Dancing Script**.
- Titulares elegantes: **Playfair Display** (serif).
- UI/cuerpo: **Poppins** (o Inter) — legible, moderno.

**Componentes:** radios generosos (`rounded-2xl`), sombras suaves, gradientes magenta sutiles,
micro-animaciones framer-motion, foco accesible visible, contraste AA. Modo claro por defecto;
soporta dark en dashboard.

Exponer todo como CSS variables (`--brand-500`, etc.) en `globals.css` para permitir marca blanca por
tenant (el tenant puede sobreescribir via `Tenant.brand`).

## 9. Superficies frontend (`apps/web/src/app/` — fan-out por área)

- **Web pública** (`(marketing)`): inicio con video hero, presentación, servicios, galería filtrable,
  antes/después, opiniones, equipo, blog (listado + post), contacto + mapa + WhatsApp flotante,
  **reserva rápida sin registro** (wizard: servicio → profesional → fecha/hora → datos).
- **Auth** (`(auth)`): login, registro, recuperar contraseña.
- **Portal cliente** (`(client)`): dashboard, mis citas (reservar/cancelar/reprogramar), tarjeta de
  fidelización (10→1 gratis), historial de pagos/facturas, mis fotos, diseños favoritos, bonos,
  tarjetas regalo, promociones, notificaciones, perfil.
- **Panel salón** (`(admin)`): agenda tipo Google Calendar (día/semana/mes, drag&drop, lista de espera),
  CRM de clientas (ficha completa), caja, inventario, empleados, tienda, academia, marketing,
  estadísticas (dashboard con gráficas), ajustes/branding.
- **Super Admin** (`(superadmin)`): salones, planes, suscripciones, incidencias, activar módulos,
  estadísticas globales, entrar-como-salón (impersonar) para soporte.

Convenciones front: Server Components por defecto; Client Components solo donde haga falta interacción.
Data fetching con TanStack Query contra el BFF (`/api/*` route handlers que reenvían a Nest con la cookie).
Formularios react-hook-form + zod. Estados de carga/skeleton, error boundaries, toasts. i18n next-intl.

## 10. Variables de entorno (`.env.example`)

`NODE_ENV`, `API_PORT=3001`, `WEB_PORT=3000`, `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL=900`, `JWT_REFRESH_TTL=604800`, `COOKIE_DOMAIN`, `CORS_ORIGINS`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SMTP_URL`/`RESEND_API_KEY`, `PLATFORM_DOMAIN=fgdbeauty.app`,
`DEFAULT_TENANT_SLUG=aurora`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`. Arranque valida con zod.

## 11. Calidad y verificación

- `pnpm -w typecheck` y `pnpm -w build` deben pasar. ESLint + Prettier sin errores.
- Tests unitarios de servicios críticos (auth, tenancy, bookings, loyalty, payments).
- Cada módulo compila de forma aislada. La fase de integración registra todo y hace build final.
- Reporte honesto: lo que quede como stub/TODO se marca con `// TODO(fase-N):` y se lista en el resumen.

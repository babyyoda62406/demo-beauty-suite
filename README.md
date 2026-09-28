# Beauty Suite (versión pública de demostración)

SaaS multi-tenant de marca blanca para la gestión integral de centros de belleza:
agenda y reservas, CRM, caja y pagos, inventario, empleados y comisiones,
fidelización, academia y un portal público con reserva sin registro.

Cada salón es un *tenant* aislado que personaliza marca, dominio y datos por
configuración.

## Sobre este repositorio

Esto es la **versión pública** de un producto real que construí y puse en
producción. Es el mismo código y la misma arquitectura, con una diferencia: todo
lo que identificaba al cliente se ha sustituido.

- El tenant de ejemplo es ficticio (*Estudio Aurora*), igual que sus datos de
  contacto, dirección, redes y empleadas.
- Las imágenes son marcadores de posición, no fotografías del negocio real.
- Las notas internas de producto y la documentación comercial no se incluyen.
- El historial de git empieza de cero en esta versión.

El objetivo es que se pueda leer la arquitectura y las decisiones técnicas sin
exponer información de nadie.

Autor: Deivis Torres Mena · [github.com/babyyoda62406](https://github.com/babyyoda62406)

---


## Stack

| Capa        | Tecnologías |
| ----------- | ----------- |
| Monorepo    | pnpm workspaces + Turborepo · Node 22 · pnpm 10 |
| Backend     | NestJS 10 · TypeScript 5.5 · Prisma 5 + PostgreSQL 16 · Redis 7 (caché + BullMQ) · Passport-JWT · argon2 · Stripe · nodemailer · Swagger · pino |
| Frontend    | Next.js 15 (App Router, React 19) · TailwindCSS 3 · shadcn/Radix · TanStack Query · Zustand · react-hook-form + zod · next-intl · framer-motion · Recharts |
| Infra       | Docker multi-stage · docker-compose (postgres, redis, mailhog, api, web) · GitHub Actions CI |

---

## Arquitectura

```
                        ┌──────────────────────────────────────────┐
                        │              Navegador                    │
                        │  Web pública · Portal · Panel · SuperAdmin │
                        └───────────────────┬──────────────────────┘
                                            │ HTTPS (cookies httpOnly)
                                            ▼
                        ┌──────────────────────────────────────────┐
                        │        apps/web — Next.js 15 (BFF)         │
                        │  Server Components + Route Handlers /api/* │
                        └───────────────────┬──────────────────────┘
                                            │ REST /api/v1/*  (cookie → JWT)
                                            ▼
                        ┌──────────────────────────────────────────┐
                        │        apps/api — NestJS 10                │
                        │  Auth/RBAC · Tenancy · Módulos de dominio  │
                        │  Prisma (tenant-scoped) · BullMQ workers    │
                        └───────┬───────────────┬──────────────┬────┘
                                │               │              │
                                ▼               ▼              ▼
                        ┌────────────┐   ┌────────────┐  ┌───────────┐
                        │ PostgreSQL │   │  Redis 7   │  │  Mailhog  │
                        │    16      │   │ caché+cola │  │  (SMTP)   │
                        └────────────┘   └────────────┘  └───────────┘

  packages/  →  @fgd/types · @fgd/theme · @fgd/ui · @fgd/tsconfig · @fgd/eslint-config
```

Multi-tenancy: _shared database, shared schema_ con columna `tenantId` en toda
entidad de negocio; `PrismaService` fuerza el filtro por tenant. El tenant se
resuelve por header `X-Tenant` (dev), subdominio o dominio propio. Detalle completo
en [`docs/SPEC.md`](docs/SPEC.md).

---

## Cómo levantar

Requisitos: Docker + Docker Compose, y (para desarrollo local) Node 22 y pnpm 10
(`corepack enable`).

```bash
# 1) Prepara el entorno (crea .env desde .env.example)
make setup

# 2) Levanta toda la stack (postgres, redis, mailhog, api, web)
make up

# 3) Aplica migraciones y carga datos de ejemplo
make migrate
make seed
```

URLs por defecto:

| Servicio   | URL |
| ---------- | --- |
| Web        | http://localhost:3000 |
| API        | http://localhost:3001/api/v1 |
| Healthcheck| http://localhost:3001/api/v1/health |
| Mailhog UI | http://localhost:8025 |

Comandos útiles del `Makefile`: `make up`, `make down`, `make logs`, `make ps`,
`make migrate`, `make generate`, `make seed`, `make dev`, `make fmt`, `make clean`.
Ejecuta `make help` para la lista completa.

Para trabajar sin contenedores (API y web con hot-reload) usa `make dev` (turbo),
apuntando a una base de datos y Redis locales o a los del compose.

---

## Despliegue a producción

El despliegue al VPS es un único script repetible:

```bash
./scripts/deploy.sh              # todo: api + web + migraciones
./scripts/deploy.sh web          # solo la web (lo más habitual y rápido)
./scripts/deploy.sh api          # solo la API
./scripts/deploy.sh web --dry-run  # enseña qué se sincronizaría, sin tocar el VPS
./scripts/deploy.sh all --no-migrate  # reconstruye sin migrar ni sembrar
```

Qué garantiza:

- **Solo viaja lo versionado.** Sincroniza por `git ls-files`, así nunca suben
  capturas, `tsbuildinfo` ni ficheros sueltos del escritorio. Los ficheros que
  dejan de estar versionados se eliminan del VPS (manifiesto `.deploy-manifest`).
- **Los secretos no se despliegan.** El `.env` de producción vive solo en el VPS;
  el script aborta si detectase un `.env` versionado.
- **Copia de seguridad de la BD antes de migrar**, siempre, con rotación de las
  10 últimas en `backups/`. Si el dump sale vacío, aborta sin migrar.
- **Verificación post-despliegue**: espera a que los contenedores estén *healthy*
  y comprueba por HTTP que la home y el login devuelven 200. Falla ruidosamente.

### El seed NO es destructivo

El servicio `migrate` ejecuta `prisma migrate deploy && seed` en **cada**
despliegue. Por eso `apps/api/prisma/seed.ts` solo **crea lo que falta** y jamás
sobrescribe ni resucita contenido del tenant: precios, textos, fotos, marca,
contraseñas, sellos de fidelización, opiniones y servicios creados por la clienta
sobreviven a los despliegues. El contenido de ejemplo (clientas, reservas, blog y
galería de muestra) solo se siembra al arrancar un tenant vacío.

Para un **reset de desarrollo** que restaure los valores canónicos:

```bash
SEED_FORCE_UPDATE=1 pnpm --filter @fgd/api run seed
```

> ⚠️ No uses `SEED_FORCE_UPDATE=1` contra producción: pisaría el trabajo de la clienta.

---

## Variables de entorno

Se declaran en [`.env.example`](.env.example) y el arranque de la API las valida
con **zod** (falla si falta alguna). Resumen:

| Variable | Descripción |
| -------- | ----------- |
| `NODE_ENV` | Entorno (`development` / `production`). |
| `API_PORT` / `WEB_PORT` | Puertos de API (3001) y web (3000). |
| `DATABASE_URL` | Cadena de conexión PostgreSQL. |
| `REDIS_URL` | Conexión Redis (caché + colas BullMQ). |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secretos JWT (genera con `openssl rand -hex 32`). |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | TTL en segundos (access 900, refresh 604800). |
| `COOKIE_DOMAIN` | Dominio de las cookies httpOnly. |
| `CORS_ORIGINS` | Allowlist de orígenes CORS (separados por coma). |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Claves de Stripe (suscripciones + pagos). |
| `SMTP_URL` / `RESEND_API_KEY` | Envío de email (Mailhog en local o Resend en prod). |
| `PLATFORM_DOMAIN` | Dominio de plataforma (`fgdbeauty.app`). |
| `DEFAULT_TENANT_SLUG` | Slug del tenant por defecto (`aurora`). |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL` | URLs públicas expuestas al navegador. |

> Nunca subas `.env` al repositorio. Los valores de `.env.example` son _dummy_.

---

## Estado del proyecto

Todo lo descrito aquí está implementado y desplegado. Cifras del repositorio:

| | |
|---|---|
| API (NestJS) | 19.006 líneas · 232 ficheros · 17 módulos de dominio |
| Web (Next.js) | 29.215 líneas · 260 ficheros · 6 superficies |
| Modelo de datos | 54 entidades en Prisma, con migraciones |
| Tests | 18 suites de servicio |

### Módulos de la API

`auth` · `tenancy` · `tenants` · `users` · `superadmin` · `plans-billing` ·
`clients` (CRM) · `catalog` · `bookings` (agenda, lista de espera, horarios) ·
`loyalty` · `payments-cash` · `inventory` · `store` · `employees` ·
`academy` (LMS) · `content` (blog, galería, testimonios) · `notifications` ·
`stats` · `ai` · `uploads`

### Superficies del frontend

Web pública · Autenticación · Portal de la clienta · Panel del salón ·
Super Admin · Tarjeta regalo · Ticket

### Lo que no está

- Pasarela de pago en vivo: la integración con Stripe está construida pero
  corre en modo de prueba.
- Aplicación móvil: la plataforma es web, no hay cliente nativo.

## Estructura del repositorio

```
apps/
  api/   NestJS (Dockerfile, prisma, src)
  web/   Next.js (Dockerfile, src)
packages/
  types/ theme/ ui/ config-ts/ eslint-config/
docs/    SPEC.md, requisitos, ADRs
assets/  brand/ (logo del tenant)
```

Convenciones y propiedad de ficheros: cada fase escribe solo en sus rutas; el
wiring central se hace en la fase de integración. Ver [`docs/SPEC.md`](docs/SPEC.md).

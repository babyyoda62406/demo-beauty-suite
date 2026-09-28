/**
 * FGD Beauty Suite — seed idempotente y NO DESTRUCTIVO.
 *
 * Ejecuta con `pnpm --filter api run seed` (o `ts-node prisma/seed.ts` dentro de
 * `apps/api`). Las contraseñas se hashean con argon2id, igual que `AuthService`
 * (`apps/api/src/auth/auth.service.ts`).
 *
 * ## Contrato (IMPORTANTE)
 *
 * Este seed se ejecuta en CADA despliegue de producción (servicio `migrate` de
 * `docker-compose.prod.yml`), sobre una base de datos que la dueña del salón edita a diario desde el panel. Por tanto su contrato es:
 *
 *  - Por defecto SOLO CREA lo que falta. Nunca sobrescribe, borra ni resucita
 *    nada: ni contraseñas, ni precios, ni la marca, ni los sellos de
 *    fidelización, ni las fotos o las opiniones que la clienta haya borrado.
 *  - El contenido de EJEMPLO (clientas, reservas, blog, galería de muestra,
 *    testimonios) se siembra solo al arrancar un tenant vacío (`isNewTenant`).
 *  - Excepción segura: un `imageUrl` de servicio VACÍO se rellena con la foto
 *    por defecto — un campo vacío significa que nadie eligió foto.
 *
 * Para volver al estado canónico en desarrollo (y solo ahí):
 *   `SEED_FORCE_UPDATE=1 pnpm --filter @fgd/api run seed`
 * que reactiva las sobrescrituras y la poda del catálogo.
 *
 * Sembra:
 *  - Los 4 planes de plataforma (STARTER, PROFESSIONAL, BUSINESS, ENTERPRISE).
 *  - Un SUPERADMIN de plataforma (tenantId null).
 *  - El tenant "aurora" (Estudio Aurora, plan ENTERPRISE) con su OWNER.
 *  - 3 empleadas reservables con horario L-V 10:00-20:00 y S 10:00-14:00.
 *  - Catálogo de categorías/servicios de un salón de uñas.
 *  - 7 clientas de ejemplo con su tarjeta de fidelización.
 *  - Contenido público: blog, galería y testimonios.
 *  - 3 reservas de ejemplo en la agenda de esta semana.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { PrismaClient, Role, UserStatus, type Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/** Hashes a secret with argon2id — mirrors `AuthService['hashSecret']`. */
async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret, { type: argon2.argon2id });
}

/**
 * Cuando está activo, el seed SOBRE-ESCRIBE los datos existentes del tenant
 * (contraseñas, precios, marca, sellos…) para volver a un estado conocido de
 * desarrollo. Por defecto está DESACTIVADO: en producción el seed corre en cada
 * despliegue (servicio `migrate`) y NUNCA debe pisar lo que el salón edita.
 * Actívalo solo para un reset de dev: `SEED_FORCE_UPDATE=1 pnpm --filter @fgd/api run seed`.
 */
const FORCE_UPDATE = process.env.SEED_FORCE_UPDATE === '1';

/** Finds a user by (tenantId, email) and creates it if missing. `tenantId` is
 * nullable (platform SUPERADMIN), so this avoids relying on Prisma's compound
 * unique lookup with a null field. NO destructivo por defecto: si el usuario ya
 * existe se devuelve tal cual (no resetea contraseña/rol); solo con
 * {@link FORCE_UPDATE} se sobre-escribe. `passwordApplied` indica si la
 * contraseña de este seed es realmente la que quedó guardada (para no anunciar
 * credenciales falsas en el resumen). */
async function upsertUser(params: {
  tenantId: string | null;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  phone?: string | null;
  status?: UserStatus;
}): Promise<{ user: { id: string; email: string }; passwordApplied: boolean }> {
  const existing = await prisma.user.findFirst({
    where: { tenantId: params.tenantId, email: params.email },
  });
  const data = {
    passwordHash: params.passwordHash,
    role: params.role,
    name: params.name,
    phone: params.phone ?? null,
    status: params.status ?? UserStatus.ACTIVE,
  };
  if (existing) {
    // Preserva la contraseña y los datos actuales salvo reset de dev explícito.
    if (!FORCE_UPDATE) return { user: existing, passwordApplied: false };
    const updated = await prisma.user.update({ where: { id: existing.id }, data });
    return { user: updated, passwordApplied: true };
  }
  const created = await prisma.user.create({
    data: { tenantId: params.tenantId, email: params.email, ...data },
  });
  return { user: created, passwordApplied: true };
}

/** Weekday helpers for `WorkingHours.weekday` (0 = Sunday .. 6 = Saturday). */
const MONDAY = 1;
const FRIDAY = 5;
const SATURDAY = 6;

/** Returns a Date this week for the given ISO weekday (1=Mon..7=Sun mapped from
 * the Prisma 0=Sun..6=Sat convention), at the given local hour/minute. */
function thisWeek(targetWeekday: number, hour: number, minute: number): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = (targetWeekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main(): Promise<void> {
  console.log('== FGD Beauty Suite — seed ==');

  // ---------------------------------------------------------------------
  // 1) Planes de plataforma (SPEC §7)
  // ---------------------------------------------------------------------
  const moduleFlagsBase = {
    catalog: false,
    bookings: false,
    loyalty: false,
    paymentsCash: false,
    inventory: false,
    store: false,
    employees: false,
    academy: false,
    marketing: false,
    notifications: false,
    stats: false,
    content: false,
    ai: false,
  };

  const plans: Array<{
    key: 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';
    name: string;
    priceMonthly: number;
    features: Prisma.InputJsonValue;
    moduleFlags: Prisma.InputJsonValue;
  }> = [
    {
      key: 'STARTER',
      name: 'Starter',
      priceMonthly: 2900,
      features: {
        maxEmployees: 2,
        maxServices: 15,
        maxClients: 200,
        support: 'email',
        whiteLabel: false,
      },
      moduleFlags: {
        ...moduleFlagsBase,
        catalog: true,
        bookings: true,
        loyalty: true,
        notifications: true,
        content: true,
      },
    },
    {
      key: 'PROFESSIONAL',
      name: 'Professional',
      priceMonthly: 5900,
      features: {
        maxEmployees: 5,
        maxServices: 40,
        maxClients: 1000,
        support: 'email',
        whiteLabel: false,
      },
      moduleFlags: {
        ...moduleFlagsBase,
        catalog: true,
        bookings: true,
        loyalty: true,
        notifications: true,
        content: true,
        paymentsCash: true,
        employees: true,
        stats: true,
        marketing: true,
      },
    },
    {
      key: 'BUSINESS',
      name: 'Business',
      priceMonthly: 9900,
      features: {
        maxEmployees: 15,
        maxServices: 100,
        maxClients: 5000,
        support: 'priority',
        whiteLabel: true,
      },
      moduleFlags: {
        ...moduleFlagsBase,
        catalog: true,
        bookings: true,
        loyalty: true,
        notifications: true,
        content: true,
        paymentsCash: true,
        employees: true,
        stats: true,
        marketing: true,
        inventory: true,
        store: true,
        academy: true,
      },
    },
    {
      key: 'ENTERPRISE',
      name: 'Enterprise',
      priceMonthly: 19900,
      features: {
        maxEmployees: null,
        maxServices: null,
        maxClients: null,
        support: 'dedicated',
        whiteLabel: true,
      },
      moduleFlags: {
        catalog: true,
        bookings: true,
        loyalty: true,
        notifications: true,
        content: true,
        paymentsCash: true,
        employees: true,
        stats: true,
        marketing: true,
        inventory: true,
        store: true,
        academy: true,
        ai: true,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { key: plan.key },
      update: {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        currency: 'EUR',
        features: plan.features,
        moduleFlags: plan.moduleFlags,
      },
      create: {
        key: plan.key,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        currency: 'EUR',
        features: plan.features,
        moduleFlags: plan.moduleFlags,
      },
    });
  }
  console.log(`Planes: ${plans.map((p) => p.key).join(', ')}`);

  // ---------------------------------------------------------------------
  // 2) SUPERADMIN de plataforma
  // ---------------------------------------------------------------------
  const superadminPassword = 'Admin1234!';
  const { passwordApplied: superadminPasswordApplied } = await upsertUser({
    tenantId: null,
    email: 'superadmin@fgdbeauty.app',
    passwordHash: await hashSecret(superadminPassword),
    role: Role.SUPERADMIN,
    name: 'Super Admin',
  });
  console.log('Usuario SUPERADMIN: superadmin@fgdbeauty.app');

  // ---------------------------------------------------------------------
  // 3) Tenant Aurora (SPEC §8 — paleta magenta)
  // ---------------------------------------------------------------------
  const brand: Prisma.InputJsonValue = {
    colors: {
      brand: {
        '50': '#FCE7F1',
        '100': '#FBCFE3',
        '200': '#F7A9CC',
        '300': '#F075AE',
        '400': '#E84393',
        '500': '#D6157F',
        '600': '#C2185B',
        '700': '#9D0E4B',
        '800': '#7A0B3A',
        '900': '#5A0A2C',
        '950': '#3A0620',
      },
      ink: '#141414',
      inkSoft: '#2B2B2B',
    },
    logoUrl: '/brand/logo.jpeg',
    fonts: { display: 'Dancing Script', heading: 'Playfair Display', body: 'Poppins' },
    socials: {
      instagram: 'https://instagram.com/estudioaurora',
      facebook: 'https://facebook.com/estudioaurora',
      whatsapp: '+34600123456',
    },
  };

  // `isNewTenant` distingue el bootstrap inicial (crear datos de ejemplo) de un
  // re-despliegue sobre un tenant ya en uso (no tocar su
  // contenido). Con FORCE_UPDATE se re-siembra todo como en un reset de dev.
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: 'aurora' } });
  const isNewTenant = !existingTenant;
  const tenantSettings = {
    name: 'Estudio Aurora',
    planKey: 'ENTERPRISE' as const,
    status: 'ACTIVE' as const,
    timezone: 'Europe/Madrid',
    locale: 'es-ES',
    currency: 'EUR',
    brand,
    email: 'hola@estudioaurora.demo',
    phone: '+34 600 123 456',
  };
  const aurora =
    existingTenant && !FORCE_UPDATE
      ? existingTenant // preserva marca/redes/contacto que edite el salón
      : await prisma.tenant.upsert({
          where: { slug: 'aurora' },
          update: tenantSettings,
          create: { slug: 'aurora', legalName: 'Estudio Aurora Uñas S.L.', ...tenantSettings },
        });
  console.log(`Tenant: ${aurora.slug} (${aurora.id})${isNewTenant ? ' [nuevo]' : ''}`);

  // Contenido de EJEMPLO (clientas, reservas, blog, galería de muestra,
  // testimonios): solo tiene sentido al arrancar un tenant vacío. Si el salón ya
  // está en marcha no se vuelve a sembrar, porque resucitaría lo que el salón
  // haya borrado desde el panel.
  const seedDemoContent = isNewTenant || FORCE_UPDATE;

  // ---------------------------------------------------------------------
  // 4) Usuario OWNER de Aurora
  // ---------------------------------------------------------------------
  const ownerPassword = 'Demo1234!';
  const { user: owner, passwordApplied: ownerPasswordApplied } = await upsertUser({
    tenantId: aurora.id,
    email: 'aurora@estudioaurora.demo',
    passwordHash: await hashSecret(ownerPassword),
    role: Role.OWNER,
    name: 'Estudio Aurora',
    phone: '+34 600 123 456',
  });
  console.log(`Usuario OWNER: ${owner.email}`);

  // ---------------------------------------------------------------------
  // 5) Empleadas (profesionales reservables) + horarios
  // ---------------------------------------------------------------------
  const employeesData = [
    { name: 'Estudio Aurora', title: 'Directora / Nail Artist Senior', color: '#D6157F', email: 'aurora.staff@estudioaurora.demo' },
    { name: 'Nadia Ruiz', title: 'Especialista en uñas acrílicas', color: '#9D0E4B', email: 'nadia.ruiz@estudioaurora.demo' },
    { name: 'Irene Sol', title: 'Especialista en nail art', color: '#E84393', email: 'irene.sol@estudioaurora.demo' },
  ];

  const employees = [];
  for (const emp of employeesData) {
    let employee = await prisma.employee.findFirst({
      where: { tenantId: aurora.id, email: emp.email },
    });
    if (employee) {
      if (FORCE_UPDATE) {
        employee = await prisma.employee.update({
          where: { id: employee.id },
          data: { name: emp.name, title: emp.title, color: emp.color, active: true, bookable: true },
        });
      }
      // no destructivo: conserva lo que el salón haya editado de la empleada
    } else {
      employee = await prisma.employee.create({
        data: {
          tenantId: aurora.id,
          name: emp.name,
          title: emp.title,
          email: emp.email,
          phone: '+34 600 123 400',
          color: emp.color,
          active: true,
          bookable: true,
          bio: `${emp.name} — ${emp.title} en Estudio Aurora.`,
        },
      });
    }
    employees.push(employee);

    // WorkingHours: L-V 10:00-20:00, S 10:00-14:00.
    const weekdaysMonToFri = [MONDAY, MONDAY + 1, MONDAY + 2, MONDAY + 3, FRIDAY];
    const schedule: Array<{ weekday: number; startTime: string; endTime: string }> = [
      ...weekdaysMonToFri.map((weekday) => ({ weekday, startTime: '10:00', endTime: '20:00' })),
      { weekday: SATURDAY, startTime: '10:00', endTime: '14:00' },
    ];
    for (const slot of schedule) {
      const existingSlot = await prisma.workingHours.findFirst({
        where: { tenantId: aurora.id, employeeId: employee.id, weekday: slot.weekday },
      });
      if (!existingSlot) {
        await prisma.workingHours.create({
          data: {
            tenantId: aurora.id,
            employeeId: employee.id,
            weekday: slot.weekday,
            startTime: slot.startTime,
            endTime: slot.endTime,
          },
        });
      }
    }
  }
  console.log(`Empleadas: ${employees.map((e) => e.name).join(', ')}`);

  // ---------------------------------------------------------------------
  // 6) Categorías de servicios + servicios
  // ---------------------------------------------------------------------
  const categoriesData = [
    { name: 'Manicura', sortOrder: 1 },
    { name: 'Pedicura', sortOrder: 2 },
    { name: 'Uñas Acrílicas', sortOrder: 3 },
    { name: 'Esmaltado Semipermanente', sortOrder: 4 },
    { name: 'Nail Art', sortOrder: 5 },
    { name: 'Kids', sortOrder: 6 },
  ];

  const categories: Record<string, { id: string }> = {};
  for (const cat of categoriesData) {
    let category = await prisma.serviceCategory.findFirst({
      where: { tenantId: aurora.id, name: cat.name },
    });
    if (!category) {
      category = await prisma.serviceCategory.create({
        data: { tenantId: aurora.id, name: cat.name, sortOrder: cat.sortOrder },
      });
    }
    categories[cat.name] = category;
  }

  // Catálogo de ejemplo. Precios en CÉNTIMOS.
  // Los servicios "a consultar / incluido / aparte" se guardan con price 0 y se
  // marcan en `description` para que el panel y /reservar lo reflejen.
  const servicesData: Array<{
    category: string;
    name: string;
    durationMin: number;
    price: number;
    description: string;
    /** Frase llamativa corta , se muestra en la tarjeta. */
    tagline: string;
    /** price 0 = tarifa no fija (consultar/incluido/aparte). */
    priceOnRequest?: boolean;
  }> = [
    {
      category: 'Uñas Acrílicas',
      name: 'Uñas acrílicas esculpidas',
      durationMin: 90,
      price: 3500,
      tagline: 'Diseños únicos para unas manos que no pasan desapercibidas.',
      description:
        'Uñas creadas desde cero, adaptadas a tus manos y al largo elegido. Precio desde 35 € (varía según el largo; 35 € ≈ talla M / nº 2).',
    },
    {
      category: 'Uñas Acrílicas',
      name: 'Relleno de acrílico o gel',
      durationMin: 60,
      price: 2500,
      tagline: 'Renueva tus uñas sin empezar desde cero.',
      description: 'Mantenimiento del crecimiento de la uña para devolverle forma, resistencia y acabado.',
    },
    {
      category: 'Manicura',
      name: 'Manicura rusa',
      durationMin: 60,
      price: 0,
      priceOnRequest: true,
      tagline: 'La diferencia está en los pequeños detalles.',
      description:
        'Precio a consultar. Limpieza profunda y detallada de la cutícula para un acabado más limpio, fino y profesional.',
    },
    {
      category: 'Esmaltado Semipermanente',
      name: 'Esmalte semipermanente',
      durationMin: 45,
      price: 2000,
      tagline: 'Color, brillo y elegancia para cada día.',
      description: 'Color brillante y duradero, sin perder el aspecto natural de la uña.',
    },
    {
      category: 'Esmaltado Semipermanente',
      name: 'Cubrimiento con base rubber',
      durationMin: 45,
      price: 2500,
      tagline: 'Uñas naturales, fuertes y bonitas.',
      description: 'Refuerzo flexible para proteger la uña natural, corregir imperfecciones y ayudarla a crecer.',
    },
    {
      category: 'Pedicura',
      name: 'Pedicura profunda',
      durationMin: 45,
      price: 2500,
      tagline: 'Pies bonitos, cuidados y renovados.',
      description: 'Limpieza detallada de uñas y cutículas para dejar los pies cuidados y renovados.',
    },
    {
      category: 'Pedicura',
      name: 'Pedi Spa',
      durationMin: 60,
      price: 3500,
      tagline: 'El descanso y cuidado que tus pies se merecen.',
      description: 'Servicio más completo: limpieza, cuidado y un momento de relajación para tus pies.',
    },
    {
      category: 'Pedicura',
      name: 'Limpieza de pedicura',
      durationMin: 40,
      price: 2000,
      tagline: 'Cuidado esencial para unos pies impecables.',
      description: 'Limpieza de uñas y cutículas para mantener los pies cuidados y saludables.',
    },
    {
      category: 'Uñas Acrílicas',
      name: 'Reconstrucción de uña',
      durationMin: 60,
      price: 0,
      priceOnRequest: true,
      tagline: 'Recupera la belleza natural de tus uñas.',
      description: 'Precio a consultar. Reconstrucción de la uña dañada para devolverle forma y resistencia.',
    },
    {
      category: 'Kids',
      name: 'Manicura y pedicura Kids',
      durationMin: 45,
      price: 2000,
      tagline: 'Un momento especial lleno de color y diversión.',
      description: 'Servicio delicado para las más pequeñas, con colores y diseños alegres adaptados a su edad.',
    },
    {
      category: 'Nail Art',
      name: 'Diseños personalizados',
      durationMin: 30,
      price: 0,
      priceOnRequest: true,
      tagline: 'Tú traes la idea y juntas la convertimos en diseño.',
      description: 'Incluido: los diseños normales están incluidos. Elige colores, efectos y decoraciones a tu estilo.',
    },
    {
      category: 'Nail Art',
      name: 'Flores 3D / diseños en relieve',
      durationMin: 30,
      price: 0,
      priceOnRequest: true,
      tagline: 'Pequeñas obras de arte creadas sobre tus uñas.',
      description: 'Se cobra aparte. Decoraciones hechas a mano en relieve para un acabado más artístico.',
    },
  ];

  // Foto por defecto de cada servicio (estáticas en /brand/gallery, servidas por
  // la web). Solo se aplica al crear o si el servicio aún no tiene foto: nunca
  // pisa una foto subida por el salón desde el CMS ni el parche de la BD viva.
  const serviceImageByName: Record<string, string> = {
    'Uñas acrílicas esculpidas': '/brand/gallery/acrilicas-1.jpg',
    'Relleno de acrílico o gel': '/brand/gallery/acrilicas-2.jpg',
    'Manicura rusa': '/brand/gallery/manicura-rusa-1.jpg',
    'Esmalte semipermanente': '/brand/gallery/semipermanente-1.jpg',
    'Cubrimiento con base rubber': '/brand/gallery/rubber-1.jpg',
    'Pedicura profunda': '/brand/gallery/pedicura-1.jpg',
    'Pedi Spa': '/brand/gallery/pedi-spa-1.jpg',
    'Limpieza de pedicura': '/brand/gallery/limpieza-pedicura-1.jpg',
    'Reconstrucción de uña': '/brand/gallery/reconstruccion-1.jpg',
    'Manicura y pedicura Kids': '/brand/gallery/kids-1.jpg',
    'Diseños personalizados': '/brand/gallery/nail-art-1.jpg',
    'Flores 3D / diseños en relieve': '/brand/gallery/flores-3d-1.jpg',
  };

  const services: Record<string, { id: string; price: number; durationMin: number }> = {};
  for (const svc of servicesData) {
    let service = await prisma.service.findFirst({
      where: { tenantId: aurora.id, name: svc.name },
    });
    if (service) {
      // Foto que falta: se completa SIEMPRE (un `imageUrl` vacío significa que
      // nadie eligió foto, así que rellenarlo no pisa ninguna decisión).
      const imageToFill = service.imageUrl?.trim() ? null : serviceImageByName[svc.name] ?? null;
      if (FORCE_UPDATE) {
        // Reset de dev: restaura los valores canónicos del catálogo.
        service = await prisma.service.update({
          where: { id: service.id },
          data: {
            durationMin: svc.durationMin,
            price: svc.price,
            description: svc.description,
            tagline: svc.tagline,
            categoryId: categories[svc.category]?.id ?? null,
            ...(imageToFill ? { imageUrl: imageToFill } : {}),
          },
        });
      } else if (imageToFill) {
        service = await prisma.service.update({
          where: { id: service.id },
          data: { imageUrl: imageToFill },
        });
      }
      // Sin FORCE_UPDATE no se toca nada más: precio, descripción, gancho y
      // categoría son del salón (los edita desde el CMS).
    } else {
      service = await prisma.service.create({
        data: {
          tenantId: aurora.id,
          categoryId: categories[svc.category]?.id ?? null,
          name: svc.name,
          durationMin: svc.durationMin,
          price: svc.price,
          description: svc.description,
          tagline: svc.tagline,
          imageUrl: serviceImageByName[svc.name] ?? '',
          currency: 'EUR',
          active: true,
        },
      });
    }
    services[svc.name] = service;
  }
  // Poda: desactiva servicios que no están en el catálogo canónico. SOLO en un
  // reset de dev — en producción desactivaría los servicios que el salón cree
  // desde el CMS, que por definición no salen en este array.
  let prunedCount = 0;
  if (FORCE_UPDATE) {
    const realNames = servicesData.map((s) => s.name);
    const pruned = await prisma.service.updateMany({
      where: { tenantId: aurora.id, name: { notIn: realNames }, active: true },
      data: { active: false },
    });
    prunedCount = pruned.count;
  }

  const onRequestCount = servicesData.filter((s) => s.priceOnRequest).length;
  console.log(
    `Categorías: ${Object.keys(categories).length}, Servicios: ${Object.keys(services).length} (${onRequestCount} a consultar/incluido/aparte con price 0). Servicios desactivados por poda: ${prunedCount}`,
  );

  // ---------------------------------------------------------------------
  // 7) Clientas + tarjetas de fidelización
  // ---------------------------------------------------------------------
  const clientsData = [
    { name: 'Marta Ruiz López', phone: '+34600111222', email: 'marta.ruiz@example.com', stamps: 3 },
    { name: 'Lucía Fernández Gil', phone: '+34600111223', email: 'lucia.fernandez@example.com', stamps: 7 },
    { name: 'Carmen Torres Vidal', phone: '+34600111224', email: 'carmen.torres@example.com', stamps: 10 },
    { name: 'Ana Belén Muñoz', phone: '+34600111225', email: 'ana.munoz@example.com', stamps: 0 },
    { name: 'Sofía Navarro Pardo', phone: '+34600111226', email: 'sofia.navarro@example.com', stamps: 5 },
    { name: 'Isabel Ramos Duarte', phone: '+34600111227', email: 'isabel.ramos@example.com', stamps: 2 },
    { name: 'Elena García Soto', phone: '+34600111228', email: 'elena.garcia@example.com', stamps: 9 },
  ];

  const clients = [];
  if (seedDemoContent) {
    for (const c of clientsData) {
      let client = await prisma.client.findFirst({ where: { tenantId: aurora.id, phone: c.phone } });
      if (!client) {
        client = await prisma.client.create({
          data: {
            tenantId: aurora.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            loyaltyPoints: c.stamps,
          },
        });
      }
      clients.push(client);

      await prisma.loyaltyCard.upsert({
        where: { tenantId_clientId: { tenantId: aurora.id, clientId: client.id } },
        // Los sellos son datos vivos del salón (se ganan visita a visita): no se
        // pisan nunca salvo en un reset de dev.
        update: FORCE_UPDATE ? { stamps: c.stamps } : {},
        create: {
          tenantId: aurora.id,
          clientId: client.id,
          stamps: c.stamps,
          freeEarned: c.stamps >= 10 ? 1 : 0,
          redeemedCount: 0,
        },
      });
    }
  }
  console.log(
    seedDemoContent
      ? `Clientas de ejemplo: ${clients.length}`
      : 'Clientas de ejemplo: omitidas (el salón ya tiene datos propios)',
  );

  // ---------------------------------------------------------------------
  // 8) Contenido público: blog, galería, testimonios
  // ---------------------------------------------------------------------
  const blogPostsData = [
    {
      slug: 'tendencias-unas-otono-invierno',
      title: 'Tendencias en uñas para otoño-invierno',
      excerpt: 'Los colores y acabados que arrasan esta temporada en nuestro salón.',
      tags: ['tendencias', 'temporada'],
    },
    {
      slug: 'cuidado-unas-esmaltado-semipermanente',
      title: 'Cómo cuidar tus uñas con esmaltado semipermanente',
      excerpt: 'Consejos de nuestras profesionales para que tu manicura dure más.',
      tags: ['cuidado', 'semipermanente'],
    },
    {
      slug: 'unas-acrilicas-guia-completa',
      title: 'Uñas acrílicas: guía completa antes de tu cita',
      excerpt: 'Todo lo que necesitas saber antes de tu primera sesión de acrílico.',
      tags: ['acrilico', 'guia'],
    },
    {
      slug: 'nail-art-tendencias-2026',
      title: 'Nail art: las tendencias que arrasan en 2026',
      excerpt: 'Diseños, texturas y pedrería para looks únicos esta temporada.',
      tags: ['nail-art', 'tendencias'],
    },
  ];

  // Blog de ejemplo: se siembra en el bootstrap. En un re-despliegue no se toca
  // (el salón puede haber reescrito, despublicado o borrado las entradas).
  if (seedDemoContent) {
    for (const [i, post] of blogPostsData.entries()) {
      await prisma.blogPost.upsert({
        where: { tenantId_slug: { tenantId: aurora.id, slug: post.slug } },
        update: FORCE_UPDATE
          ? {
              title: post.title,
              excerpt: post.excerpt,
              tags: post.tags,
              published: true,
            }
          : {},
        create: {
          tenantId: aurora.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          coverUrl: `https://placehold.co/1200x630/D6157F/FFF7FB?text=${encodeURIComponent(post.title)}`,
          contentMdx: `# ${post.title}\n\n${post.excerpt}\n\nContenido de ejemplo generado por el seed de desarrollo.`,
          tags: post.tags,
          published: true,
          publishedAt: new Date(Date.now() - (blogPostsData.length - i) * 7 * 24 * 60 * 60 * 1000),
          authorId: owner.id,
        },
      });
    }
  }
  console.log(
    seedDemoContent
      ? `BlogPosts de ejemplo: ${blogPostsData.length}`
      : 'BlogPosts de ejemplo: omitidos (el salón ya tiene contenido propio)',
  );

  const galleryData = [
    { category: 'manicura', isBeforeAfter: false, caption: 'Manicura francesa clásica' },
    { category: 'manicura', isBeforeAfter: true, caption: 'Antes y después: manicura de rescate' },
    { category: 'pedicura', isBeforeAfter: false, caption: 'Pedicura spa relajante' },
    { category: 'pedicura', isBeforeAfter: true, caption: 'Antes y después: pedicura correctiva' },
    { category: 'acrilico', isBeforeAfter: false, caption: 'Set completo de uñas acrílicas' },
    { category: 'acrilico', isBeforeAfter: true, caption: 'Antes y después: relleno de acrílico' },
    { category: 'nail-art', isBeforeAfter: false, caption: 'Nail art floral personalizado' },
    { category: 'nail-art', isBeforeAfter: false, caption: 'Diseño 3D con pedrería' },
  ];

  // Galería de MUESTRA (marcadores de placehold.co): solo en el bootstrap. Si se
  // resembrara en cada despliegue reaparecerían en la web pública las fotos de
  // relleno que la clienta ya borró.
  if (seedDemoContent) {
    for (const [i, item] of galleryData.entries()) {
      const existing = await prisma.galleryItem.findFirst({
        where: { tenantId: aurora.id, caption: item.caption },
      });
      if (!existing) {
        const afterUrl = `https://placehold.co/800x800/D6157F/FFF7FB?text=After+${i + 1}`;
        const beforeUrl = `https://placehold.co/800x800/2B2B2B/FFF7FB?text=Before+${i + 1}`;
        await prisma.galleryItem.create({
          data: {
            tenantId: aurora.id,
            url: item.isBeforeAfter ? afterUrl : `https://placehold.co/800x800/D6157F/FFF7FB?text=${i + 1}`,
            category: item.category,
            isBeforeAfter: item.isBeforeAfter,
            beforeUrl: item.isBeforeAfter ? beforeUrl : null,
            afterUrl: item.isBeforeAfter ? afterUrl : null,
            caption: item.caption,
            sortOrder: i,
          },
        });
      }
    }
  }
  console.log(
    seedDemoContent
      ? `GalleryItems de muestra: ${galleryData.length} (${galleryData.filter((g) => g.isBeforeAfter).length} antes/después)`
      : 'GalleryItems de muestra: omitidos (el salón ya tiene su galería)',
  );

  // ---------------------------------------------------------------------
  // 8b) Galería REAL: fotos de los trabajos de Aurora que ya están en el front
  //     (apps/web/public/brand/gallery/). La web pública pasará a leer de la
  //     API, así que sembramos un GalleryItem por cada foto (idempotente por
  //     url única). El prefijo del fichero determina la categoría (docs
  //     carrusel con filtros).
  // ---------------------------------------------------------------------
  //
  // Mapa prefijo → categoría (agrupación pedida por la clienta):
  //   acrilicas, reconstruccion            → 'acrilicas' (Uñas acrílicas)
  //   manicura-rusa, rubber                → 'natural'   (Uña natural)
  //   semipermanente                       → 'manicura'  (Manicura)
  //   pedicura, limpieza-pedicura          → 'pedicura'  (Pedicura)
  //   nail-art, flores-3d, kids            → 'disenos'   (Diseños)
  // Se ordena por longitud de prefijo desc para evitar solapes.
  const galleryCategoryByPrefix: Array<{ prefix: string; category: string }> = [
    { prefix: 'limpieza-pedicura', category: 'pedicura' },
    { prefix: 'manicura-rusa', category: 'natural' },
    { prefix: 'reconstruccion', category: 'acrilicas' },
    { prefix: 'semipermanente', category: 'manicura' },
    { prefix: 'acrilicas', category: 'acrilicas' },
    { prefix: 'flores-3d', category: 'disenos' },
    { prefix: 'nail-art', category: 'disenos' },
    { prefix: 'pedicura', category: 'pedicura' },
    { prefix: 'rubber', category: 'natural' },
    { prefix: 'kids', category: 'disenos' },
  ].sort((a, b) => b.prefix.length - a.prefix.length);

  // Ficheros reales en apps/web/public/brand/gallery. Se listan con fs; si el
  // directorio no está disponible (p. ej. el contenedor `migrate` no copia
  // apps/web), se usa la lista embebida conocida como fallback.
  const galleryDirPath = path.join(__dirname, '..', '..', 'web', 'public', 'brand', 'gallery');
  const fallbackGalleryFiles = [
    'acrilicas-1.jpg', 'acrilicas-2.jpg', 'acrilicas-3.jpg', 'acrilicas-4.jpg', 'acrilicas-5.jpg',
    'flores-3d-1.jpg', 'flores-3d-2.jpg', 'flores-3d-3.jpg', 'flores-3d-4.jpg',
    'kids-1.jpg', 'kids-2.jpg',
    'limpieza-pedicura-1.jpg',
    'manicura-rusa-1.jpg', 'manicura-rusa-2.jpg', 'manicura-rusa-3.jpg',
    'nail-art-1.jpg', 'nail-art-2.jpg', 'nail-art-3.jpg',
    'pedicura-1.jpg', 'pedicura-2.jpg', 'pedicura-3.jpg', 'pedicura-4.jpg',
    'reconstruccion-1.jpg',
    'rubber-1.jpg', 'rubber-2.jpg', 'rubber-3.jpg',
    'semipermanente-1.jpg', 'semipermanente-2.jpg', 'semipermanente-3.jpg', 'semipermanente-4.jpg',
  ];

  let galleryFiles: string[];
  try {
    galleryFiles = fs
      .readdirSync(galleryDirPath)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    if (galleryFiles.length === 0) galleryFiles = fallbackGalleryFiles;
  } catch {
    galleryFiles = fallbackGalleryFiles;
  }
  galleryFiles.sort();

  // Solo en el bootstrap: aunque estas fotos SON de la clienta, resembrarlas en
  // cada despliegue devolvería a la web las que ella haya borrado desde el CMS
  // (el borrado es su decisión y manda sobre el catálogo inicial).
  let realCreated = 0;
  if (seedDemoContent) {
    let sortOrder = 100; // por detrás de la galería de ejemplo existente
    for (const file of galleryFiles) {
      const match = galleryCategoryByPrefix.find((m) => file.startsWith(`${m.prefix}-`));
      if (!match) continue; // ignora ficheros sin prefijo conocido
      const url = `/brand/gallery/${file}`;
      const existing = await prisma.galleryItem.findFirst({ where: { tenantId: aurora.id, url } });
      if (!existing) {
        await prisma.galleryItem.create({
          data: {
            tenantId: aurora.id,
            url,
            category: match.category,
            isBeforeAfter: false,
            sortOrder: sortOrder++,
          },
        });
        realCreated += 1;
      }
    }
  }
  console.log(
    seedDemoContent
      ? `GalleryItems reales (fotos de Aurora): ${realCreated} creados de ${galleryFiles.length} ficheros`
      : 'GalleryItems reales: omitidos (se respetan los borrados de la clienta)',
  );

  const testimonialsData = [
    { clientName: 'Marta R.', rating: 5, text: 'Un trato exquisito y un resultado impecable. ¡Repetiré seguro!' },
    { clientName: 'Lucía F.', rating: 5, text: 'Las mejores uñas acrílicas que me han hecho nunca. Muy profesionales.' },
    { clientName: 'Carmen T.', rating: 4, text: 'Muy contenta con el esmaltado semipermanente, dura muchísimo.' },
    { clientName: 'Sofía N.', rating: 5, text: 'El nail art superó mis expectativas, todo el mundo me pregunta dónde me las hice.' },
    { clientName: 'Elena G.', rating: 5, text: 'Ambiente cuidado, puntualidad y un resultado precioso. Encantada.' },
  ];

  // Testimonios de ejemplo: solo en el bootstrap. Las opiniones que se publican
  // en la web las modera la clienta; si las borra, no deben volver.
  if (seedDemoContent) {
    for (const t of testimonialsData) {
      const existing = await prisma.testimonial.findFirst({
        where: { tenantId: aurora.id, clientName: t.clientName },
      });
      if (!existing) {
        await prisma.testimonial.create({
          data: {
            tenantId: aurora.id,
            clientName: t.clientName,
            rating: t.rating,
            text: t.text,
            approved: true,
          },
        });
      }
    }
  }
  console.log(
    seedDemoContent
      ? `Testimonials de ejemplo: ${testimonialsData.length}`
      : 'Testimonials de ejemplo: omitidos (los modera la clienta)',
  );

  // ---------------------------------------------------------------------
  // 8c) Academia: cursos de ejemplo del aula (RONDA 3)
  // ---------------------------------------------------------------------
  // Contenido de EJEMPLO: temario y precios los pone la clienta desde el panel.
  // Solo se siembra en un tenant vacío (o con FORCE_UPDATE) para no reintroducir
  // cursos que ella haya borrado. Sin vídeos reales: `videoUrl` queda a null.
  // TODO: temarios, precios y vídeos reales cuando la clienta los facilite.
  if (seedDemoContent) {
    const coursesData: Array<{
      title: string;
      description: string;
      kind: 'ONLINE' | 'PRESENTIAL' | 'LIVE';
      price: number;
      modules: Array<{ title: string; lessons: string[] }>;
    }> = [
      {
        title: 'Masterclass — Técnico profesional en uñas',
        description:
          'Formación completa de ejemplo: preparación, esculpido y acabado. ' +
          'Sustituye este contenido por el temario real desde el panel.',
        kind: 'ONLINE',
        price: 24900,
        modules: [
          { title: 'Fundamentos', lessons: ['Materiales y preparación', 'Higiene y esterilización'] },
          { title: 'Técnica', lessons: ['Esculpido paso a paso', 'Limado y acabado'] },
        ],
      },
      {
        title: 'Clase presencial — Manicura rusa',
        description: 'Clase presencial de ejemplo en el estudio, plazas limitadas.',
        kind: 'PRESENTIAL',
        price: 15000,
        modules: [{ title: 'Sesión práctica', lessons: ['Cutícula y detalle', 'Práctica guiada'] }],
      },
      {
        title: 'Clase privada — Nail art a medida',
        description: 'Sesión individual de ejemplo, adaptada al nivel de la alumna.',
        kind: 'LIVE',
        price: 0, // A consultar: se activa sin cobro para poder probar el aula.
        modules: [{ title: 'Sesión 1 a 1', lessons: ['Diseño personalizado'] }],
      },
    ];

    let coursesCreated = 0;
    for (const c of coursesData) {
      const existing = await prisma.course.findFirst({
        where: { tenantId: aurora.id, title: c.title },
      });
      if (existing) continue;
      const course = await prisma.course.create({
        data: {
          tenantId: aurora.id,
          title: c.title,
          description: c.description,
          kind: c.kind,
          price: c.price,
          currency: 'EUR',
          published: true,
        },
      });
      for (const [mi, m] of c.modules.entries()) {
        const mod = await prisma.courseModule.create({
          data: { courseId: course.id, title: m.title, sortOrder: mi },
        });
        for (const [li, lessonTitle] of m.lessons.entries()) {
          await prisma.lesson.create({
            data: {
              moduleId: mod.id,
              title: lessonTitle,
              contentType: 'VIDEO',
              sortOrder: li,
              // La primera lección del primer módulo es muestra gratuita: deja
              // ver el formato del curso sin regalar el resto del material.
              freePreview: mi === 0 && li === 0,
            },
          });
        }
      }
      coursesCreated += 1;
    }
    console.log(`Cursos de ejemplo de la academia: ${coursesCreated} creados`);
  } else {
    console.log('Cursos de la academia: omitidos (los gestiona la clienta)');
  }

  // ---------------------------------------------------------------------
  // 9) Reservas de ejemplo en la agenda de esta semana
  // ---------------------------------------------------------------------
  // Reservas de ejemplo: solo al arrancar un tenant vacío. En un salón en marcha
  // la agenda es real y no se inventan citas. `clients`/`employees` solo están
  // pobladas en ese mismo caso, de ahí la comprobación de longitud.
  const existingBookingsCount = await prisma.booking.count({ where: { tenantId: aurora.id } });
  const canSeedBookings =
    seedDemoContent && existingBookingsCount === 0 && clients.length >= 3 && employees.length >= 3;
  if (canSeedBookings) {
    const manicuraSpa = services['Esmalte semipermanente'];
    const relleno = services['Relleno de acrílico o gel'];
    const pedicuraExpress = services['Pedicura profunda'];

    const bookingsData: Array<{
      client: (typeof clients)[number];
      employee: (typeof employees)[number];
      service: { id: string; price: number; durationMin: number } | undefined;
      startAt: Date;
      status: 'CONFIRMED' | 'PENDING';
    }> = [
      {
        client: clients[0]!,
        employee: employees[0]!,
        service: manicuraSpa,
        startAt: thisWeek(MONDAY + 1, 11, 0), // martes 11:00
        status: 'CONFIRMED',
      },
      {
        client: clients[1]!,
        employee: employees[1]!,
        service: relleno,
        startAt: thisWeek(MONDAY + 3, 16, 30), // jueves 16:30
        status: 'CONFIRMED',
      },
      {
        client: clients[2]!,
        employee: employees[2]!,
        service: pedicuraExpress,
        startAt: thisWeek(SATURDAY, 10, 30), // sábado 10:30
        status: 'PENDING',
      },
    ];

    for (const b of bookingsData) {
      if (!b.service) continue;
      const endAt = new Date(b.startAt.getTime() + b.service.durationMin * 60 * 1000);
      await prisma.booking.create({
        data: {
          tenantId: aurora.id,
          clientId: b.client.id,
          employeeId: b.employee.id,
          serviceId: b.service.id,
          startAt: b.startAt,
          endAt,
          status: b.status,
          source: 'ADMIN',
          price: b.service.price,
          currency: 'EUR',
        },
      });
    }
    console.log(`Bookings de ejemplo creados: ${bookingsData.length}`);
  } else {
    console.log(
      `Bookings de ejemplo: omitidos (la agenda ya tiene ${existingBookingsCount} reservas o el salón está en marcha)`,
    );
  }

  // ---------------------------------------------------------------------
  // Resumen
  // ---------------------------------------------------------------------
  console.log('\n== Seed completado ==');
  console.log(
    FORCE_UPDATE
      ? 'Modo: SEED_FORCE_UPDATE=1 — se han restaurado los valores canónicos (reset de dev).'
      : 'Modo: no destructivo — solo se ha creado lo que faltaba; nada existente se ha sobrescrito.',
  );
  console.log('Credenciales de acceso:');
  // Solo se anuncia la contraseña cuando este seed la ha establecido de verdad.
  // Si el usuario ya existía, su contraseña es la que tenga puesta la clienta.
  console.log(
    `  SUPERADMIN → superadmin@fgdbeauty.app / ${superadminPasswordApplied ? superadminPassword : '(sin cambios: la que ya tuviera)'}`,
  );
  console.log(
    `  OWNER (aurora) → aurora@estudioaurora.demo / ${ownerPasswordApplied ? ownerPassword : '(sin cambios: la que ya tuviera)'} (header X-Tenant: aurora)`,
  );
}

main()
  .catch((error) => {
    console.error('Seed falló:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { NextResponse, type NextRequest } from 'next/server';

/**
 * Guarda de rutas del portal (SPEC §4). Protege las áreas privadas comprobando
 * la cookie de sesión httpOnly (`fgd_access_token`) y el rol que porta el JWT:
 *
 *  - `/salon/*`      → staff del salón (OWNER, MANAGER, EMPLOYEE)
 *  - `/portal/*`     → clientas (CLIENT)
 *  - `/plataforma/*` → plataforma FGD (SUPERADMIN)
 *
 * Sin sesión → redirige a `/login?next=<ruta>`. Con sesión de rol equivocado →
 * redirige a su propia área. La API sigue siendo la autoridad real (valida la
 * firma del token); aquí sólo hacemos el gate de navegación/UX en el borde.
 */
const ACCESS_COOKIE = 'fgd_access_token';
const REFRESH_COOKIE = 'fgd_refresh_token';

type Role = 'SUPERADMIN' | 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'CLIENT' | 'STUDENT';

const RULES: ReadonlyArray<{ prefix: string; roles: ReadonlyArray<Role> }> = [
  { prefix: '/salon', roles: ['OWNER', 'MANAGER', 'EMPLOYEE'] },
  { prefix: '/portal', roles: ['CLIENT'] },
  { prefix: '/plataforma', roles: ['SUPERADMIN'] },
];

const HOME_BY_ROLE: Record<Role, string> = {
  SUPERADMIN: '/plataforma',
  OWNER: '/salon',
  MANAGER: '/salon',
  EMPLOYEE: '/salon',
  CLIENT: '/portal',
  // La academia se separó a su propio producto (rama `academia`): ya no hay
  // aula donde aterrizar, así que una cuenta antigua de alumna va a la web.
  STUDENT: '/',
};

/** Decodifica (sin verificar firma) el payload del JWT y devuelve el rol si el token no ha expirado. */
function readRole(token: string | undefined): Role | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { role?: string; exp?: number };
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return null;
    return (payload.role as Role) ?? null;
  } catch {
    return null;
  }
}

/** Sólo permite rutas internas como destino de redirección (evita open-redirect). */
function safeNext(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const role = readRole(req.cookies.get(ACCESS_COOKIE)?.value);
  const hasRefresh = Boolean(req.cookies.get(REFRESH_COOKIE)?.value);

  const rule = RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));

  if (rule) {
    if (!role) {
      // El access token vive 15 min y el navegador lo borra al expirar, pero el
      // refresh (7 días) puede seguir vivo. Si hay refresh, dejamos pasar y que
      // la API + el refresco cliente resuelvan la autoridad, en vez de expulsar
      // a /login prematuramente. Sin refresh → no hay sesión → a /login.
      if (hasRefresh) {
        return NextResponse.next();
      }
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    if (!rule.roles.includes(role)) {
      const url = req.nextUrl.clone();
      url.pathname = HOME_BY_ROLE[role] ?? '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Ya autenticado y visitando login/registro → llévalo a su área.
  if ((pathname === '/login' || pathname === '/registro') && role) {
    const url = req.nextUrl.clone();
    url.pathname = safeNext(req.nextUrl.searchParams.get('next')) ?? HOME_BY_ROLE[role] ?? '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/salon',
    '/salon/:path*',
    '/portal',
    '/portal/:path*',
    '/plataforma',
    '/plataforma/:path*',
    '/login',
    '/registro',
  ],
};

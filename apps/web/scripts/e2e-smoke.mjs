// @ts-nocheck
/**
 * E2E smoke real de navegador (Playwright/Chromium).
 * Navega cada ruta como un usuario, captura errores de consola y excepciones
 * de runtime, detecta el error boundary de Next, y guarda un screenshot.
 *
 * Uso:  pnpm --filter web exec node scripts/e2e-smoke.mjs
 * Requiere API en :3001 y WEB en :3000 ya levantados.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://localhost:3001';
const TENANT = 'aurora';
const SHOTS = process.env.SHOTS_DIR ?? '/tmp/e2e-shots';
mkdirSync(SHOTS, { recursive: true });

/** Login contra la API y devuelve las cookies de sesión para el contexto. */
async function loginCookies(email, password) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant': TENANT },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login ${email} -> ${res.status} ${await res.text()}`);
  const setCookies = res.headers.getSetCookie?.() ?? [];
  return setCookies.map((c) => {
    const [pair, ...attrs] = c.split(';');
    const [name, ...v] = pair.split('=');
    const path = (attrs.find((a) => a.trim().toLowerCase().startsWith('path=')) ?? 'path=/')
      .split('=')[1]
      .trim();
    return { name: name.trim(), value: v.join('=').trim(), domain: 'localhost', path, httpOnly: true, sameSite: 'Lax' };
  });
}

/** Registra (idempotente-ish) una clienta para probar el portal. */
async function ensureClient(email, password) {
  try {
    await fetch(`${API}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant': TENANT },
      body: JSON.stringify({ email, password, name: 'Cliente Prueba', phone: '600111222' }),
    });
  } catch { /* si ya existe, seguimos */ }
  return loginCookies(email, password).catch(() => []);
}

const PUBLIC = ['/', '/reservar', '/login', '/registro', '/recuperar', '/blog', '/legal', '/privacidad'];
const OWNER = ['/salon', '/salon/clientas', '/salon/caja', '/salon/inventario', '/salon/empleadas', '/salon/tienda', '/salon/academia', '/salon/marketing', '/salon/estadisticas', '/salon/ajustes'];
const SUPER = ['/plataforma', '/plataforma/planes', '/plataforma/suscripciones', '/plataforma/incidencias', '/plataforma/modulos', '/plataforma/estadisticas'];
const CLIENT = ['/portal', '/portal/citas', '/portal/fidelizacion', '/portal/bonos', '/portal/pagos', '/portal/fotos', '/portal/notificaciones', '/portal/perfil'];

const results = [];

async function sweep(browser, label, routes, cookies) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  if (cookies?.length) await context.addCookies(cookies);
  for (const route of routes) {
    const page = await context.newPage();
    const crashes = []; // real JS exceptions / console errors
    const assets = [];   // failed resource loads (missing images, 401/403/404 fetch)
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/Failed to load resource/i.test(t)) assets.push(t.slice(0, 160));
      else crashes.push(`console: ${t}`.slice(0, 300));
    });
    page.on('pageerror', (e) => crashes.push(`pageerror: ${e.message}`.slice(0, 300)));
    page.on('requestfailed', (r) => assets.push(`reqfail ${r.url().replace(WEB, '')}: ${r.failure()?.errorText ?? ''}`.slice(0, 160)));
    let status = 0;
    try {
      const resp = await page.goto(`${WEB}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      status = resp?.status() ?? 0;
      // Recorrer la página para disparar lazy-load de imágenes y animaciones on-scroll.
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let y = 0;
          const step = () => {
            window.scrollTo(0, y);
            y += window.innerHeight * 0.8;
            if (y < document.body.scrollHeight) setTimeout(step, 120);
            else { window.scrollTo(0, 0); setTimeout(resolve, 400); }
          };
          step();
        });
      }).catch(() => {});
      await page.waitForTimeout(1200);
    } catch (e) {
      crashes.push(`nav: ${e.message}`.slice(0, 200));
    }
    // Next production error boundary actually shown on screen.
    const overlay = await page
      .locator('text=/Application error|client-side exception/i')
      .first()
      .isVisible()
      .catch(() => false);
    if (overlay) crashes.unshift('NEXT ERROR BOUNDARY visible en pantalla');
    const shot = `${SHOTS}/${label}${route.replace(/\//g, '_') || '_root'}.png`;
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    const ok = status === 200 && crashes.length === 0;
    results.push({ label, route, status, crashes, assets, shot, ok });
    await page.close();
  }
  await context.close();
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN ?? '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  await sweep(browser, 'pub', PUBLIC, []);
  const owner = await loginCookies('aurora@estudioaurora.demo', 'Aurora1234!').catch((e) => { console.error('OWNER login fail', e.message); return []; });
  await sweep(browser, 'owner', OWNER, owner);
  const sup = await loginCookies('superadmin@fgdbeauty.app', 'Admin1234!').catch((e) => { console.error('SUPER login fail', e.message); return []; });
  await sweep(browser, 'super', SUPER, sup);
  const cli = await ensureClient('cliente.prueba@example.com', 'Cliente1234!');
  await sweep(browser, 'client', CLIENT, cli);
} finally {
  await browser.close();
}

const bad = results.filter((r) => !r.ok);
console.log('\n================ RESULTADO E2E (usuario real) ================');
for (const r of results) {
  const tag = r.ok ? 'OK ' : 'XX ';
  const a = r.assets.length ? ` [assets:${r.assets.length}]` : '';
  console.log(`${tag} [${r.status}] ${r.label} ${r.route}${a}`);
  for (const e of r.crashes.slice(0, 3)) console.log(`       ! ${e}`);
  if (!r.ok) for (const e of [...new Set(r.assets)].slice(0, 3)) console.log(`       · ${e}`);
}
console.log(`\nTotal: ${results.length} | OK: ${results.length - bad.length} | CRASHEAN: ${bad.length}`);
console.log(`Screenshots en: ${SHOTS}`);
process.exit(0);

#!/usr/bin/env bash
# =============================================================================
# Despliegue repetible de Estudio Aurora al VPS (vps-24).
#
#   ./scripts/deploy.sh            # todo (web + api + migraciones)
#   ./scripts/deploy.sh web        # solo la web (lo más habitual)
#   ./scripts/deploy.sh api        # solo la API
#   ./scripts/deploy.sh all        # explícito, igual que sin argumentos
#
# Opciones:
#   --no-migrate    no ejecuta migraciones ni seed (solo reconstruye/levanta)
#   --dry-run       enseña lo que haría (sincroniza en seco, no toca el VPS)
#
# Qué hace, en orden:
#   1. Comprobaciones previas (repo, rama, árbol sucio, conexión ssh).
#   2. Sincroniza SOLO los ficheros versionados (`git ls-files`), así nunca
#      viaja basura local (capturas, tsbuildinfo, imágenes sueltas). El `.env`
#      de producción vive únicamente en el VPS y jamás se toca.
#   3. Copia de seguridad de la base de datos ANTES de migrar (obligatoria).
#   4. `prisma migrate deploy` + seed (el seed es NO destructivo: respeta lo
#      que la clienta edita desde el CMS; ver apps/api/prisma/seed.ts).
#   5. Reconstruye y levanta solo los servicios pedidos.
#   6. Espera a que estén "healthy" y verifica por HTTP que la web responde.
#
# Falla ruidosamente: cualquier paso que falle aborta el despliegue.
# =============================================================================
set -euo pipefail

# --- Configuración -----------------------------------------------------------
REMOTE_HOST="vps-24"
REMOTE_DIR="/root/Fgd/DockerApps/NailsAurora"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_SUBDIR="backups"
KEEP_BACKUPS=10           # cuántas copias de la BD se conservan
MANIFEST=".deploy-manifest" # lista de ficheros del último despliegue (para podar)
HEALTH_RETRIES=40
HEALTH_DELAY=3

# --- Colores (solo si la salida es una terminal) -----------------------------
if [ -t 1 ]; then
  R=$'\e[31m'; G=$'\e[32m'; Y=$'\e[33m'; B=$'\e[34m'; D=$'\e[2m'; N=$'\e[0m'
else
  R=""; G=""; Y=""; B=""; D=""; N=""
fi
say()  { printf '%s==>%s %s\n' "$B" "$N" "$*"; }
ok()   { printf '%s  ✓%s %s\n' "$G" "$N" "$*"; }
warn() { printf '%s  !%s %s\n' "$Y" "$N" "$*"; }
die()  { printf '%s  ✗ %s%s\n' "$R" "$*" "$N" >&2; exit 1; }

# --- Argumentos --------------------------------------------------------------
TARGET="all"
DO_MIGRATE=1
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    web|api|all) TARGET="$arg" ;;
    --no-migrate) DO_MIGRATE=0 ;;
    --dry-run)    DRY_RUN=1 ;;
    -h|--help)    sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Argumento desconocido: $arg (usa: web | api | all [--no-migrate] [--dry-run])" ;;
  esac
done

# Servicios de compose a levantar según el objetivo.
case "$TARGET" in
  web) SERVICES="web" ;;
  api) SERVICES="api" ;;
  all) SERVICES="api web" ;;
esac

# Servicios a RECONSTRUIR. Ojo: `migrate` es un contenedor de un solo uso con su
# propia imagen (stage `builder`), y es quien lleva las migraciones y el seed. Si
# no se reconstruye, `compose run migrate` reutiliza la imagen cacheada y ejecuta
# el seed ANTIGUO — que es justamente lo que este despliegue viene a arreglar.
BUILD_SERVICES="$SERVICES"
if [ "$DO_MIGRATE" -eq 1 ]; then
  case " $BUILD_SERVICES " in
    *" migrate "*) ;;
    *) BUILD_SERVICES="$BUILD_SERVICES migrate" ;;
  esac
fi

# =============================================================================
# 1) Comprobaciones previas
# =============================================================================
say "Comprobaciones previas"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "Esto no es un repositorio git."
cd "$REPO_ROOT"
ok "Repo: $REPO_ROOT"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
COMMIT="$(git rev-parse --short HEAD)"
ok "Rama $BRANCH @ $COMMIT"

# Un árbol sucio significa desplegar algo que no está en git: se avisa, no se
# bloquea (a veces hace falta desplegar un arreglo urgente antes de commitear).
if [ -n "$(git status --porcelain)" ]; then
  warn "El árbol tiene cambios sin commitear; se desplegará el contenido ACTUAL del disco:"
  git status --short | sed 's/^/      /'
fi

[ -f "$COMPOSE_FILE" ] || die "No encuentro $COMPOSE_FILE en la raíz del repo."

# El .env de producción vive solo en el VPS. Comprobación defensiva: que la
# lista de ficheros a sincronizar no contenga ningún .env.
if git ls-files | grep -qE '(^|/)\.env$'; then
  die "Hay un .env versionado en el repo. Abortando: los secretos no se despliegan por git."
fi
ok "Ningún .env versionado"

if [ "$DRY_RUN" -eq 0 ]; then
  ssh -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE_HOST" 'true' 2>/dev/null \
    || die "No hay conexión ssh con '$REMOTE_HOST' (¿clave cargada?)."
  ssh "$REMOTE_HOST" "test -d '$REMOTE_DIR'" || die "No existe $REMOTE_DIR en el VPS."
  ssh "$REMOTE_HOST" "test -f '$REMOTE_DIR/.env'" \
    || die "Falta el .env de producción en el VPS ($REMOTE_DIR/.env)."
  ok "Conexión ssh y .env de producción presentes"
fi

# =============================================================================
# 2) Sincronización (solo ficheros versionados)
# =============================================================================
say "Sincronizando código ($(git ls-files | wc -l | tr -d ' ') ficheros versionados)"

FILELIST="$(mktemp)"
trap 'rm -f "$FILELIST" "$FILELIST.remote" 2>/dev/null || true' EXIT
git ls-files > "$FILELIST"

RSYNC_FLAGS=(-az --files-from="$FILELIST" --exclude='.env')
if [ "$DRY_RUN" -eq 1 ]; then
  RSYNC_FLAGS+=(--dry-run --itemize-changes)
  say "MODO DRY-RUN: no se modifica el VPS"
fi

rsync "${RSYNC_FLAGS[@]}" ./ "$REMOTE_HOST:$REMOTE_DIR/" | tail -20
ok "Código sincronizado"

if [ "$DRY_RUN" -eq 1 ]; then
  say "Dry-run terminado (no se ha desplegado nada)."
  exit 0
fi

# Poda: borra en el VPS los ficheros que ya no están versionados. rsync con
# --files-from no elimina nada, así que se compara con el manifiesto anterior.
scp -q "$FILELIST" "$REMOTE_HOST:$REMOTE_DIR/$MANIFEST.new"
ssh "$REMOTE_HOST" "bash -s" <<EOF || true
  cd "$REMOTE_DIR"
  if [ -f "$MANIFEST" ]; then
    # Ficheros que estaban en el despliegue anterior y ya no están versionados
    comm -23 <(sort "$MANIFEST") <(sort "$MANIFEST.new") | while read -r stale; do
      [ -n "\$stale" ] && [ -f "\$stale" ] && rm -f "\$stale" && echo "  - eliminado obsoleto: \$stale"
    done
  fi
  mv "$MANIFEST.new" "$MANIFEST"
EOF
ok "Manifiesto actualizado (obsoletos eliminados)"

# =============================================================================
# 3) Copia de seguridad de la base de datos (antes de tocar nada)
# =============================================================================
if [ "$DO_MIGRATE" -eq 1 ]; then
  say "Copia de seguridad de la base de datos"
  ssh "$REMOTE_HOST" "bash -s" <<EOF || die "Falló la copia de seguridad; NO se ha migrado nada."
    set -euo pipefail
    cd "$REMOTE_DIR"
    set -a; . ./.env; set +a
    mkdir -p "$BACKUP_SUBDIR"
    STAMP=\$(date -u +%Y%m%d-%H%M%S)
    FILE="$BACKUP_SUBDIR/db-\$STAMP.sql.gz"
    docker exec nailsAurora-db-1 pg_dump -U "\$POSTGRES_USER" -d "\$POSTGRES_DB" | gzip > "\$FILE"
    SIZE=\$(du -h "\$FILE" | cut -f1)
    # Un dump vacío o minúsculo indica que algo fue mal: abortamos.
    if [ ! -s "\$FILE" ] || [ \$(stat -c%s "\$FILE") -lt 1024 ]; then
      echo "La copia de seguridad está vacía (\$FILE)" >&2; exit 1
    fi
    echo "  copia: \$FILE (\$SIZE)"
    # Rotación: conserva solo las $KEEP_BACKUPS más recientes.
    ls -1t "$BACKUP_SUBDIR"/db-*.sql.gz 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
    echo "  copias conservadas: \$(ls -1 "$BACKUP_SUBDIR"/db-*.sql.gz 2>/dev/null | wc -l)"
EOF
  ok "Base de datos respaldada"
else
  warn "Migraciones y seed omitidos (--no-migrate): tampoco se hace copia de seguridad"
fi

# =============================================================================
# 4) Construcción, migraciones y arranque
# =============================================================================
say "Desplegando en el VPS (objetivo: $TARGET)"

ssh "$REMOTE_HOST" "bash -s" <<EOF || die "El despliegue falló en el VPS (mira $REMOTE_DIR/deploy.log)."
  set -euo pipefail
  cd "$REMOTE_DIR"
  LOG=deploy.log
  {
    echo ""
    echo "===== despliegue \$(date -u +%FT%TZ) — objetivo=$TARGET commit=$COMMIT rama=$BRANCH ====="
  } >> "\$LOG"

  echo "[1/4] build ($BUILD_SERVICES)"
  docker compose -f "$COMPOSE_FILE" build $BUILD_SERVICES >> "\$LOG" 2>&1 \
    || { echo "BUILD FALLIDO"; tail -30 "\$LOG"; exit 1; }

  if [ "$DO_MIGRATE" -eq 1 ]; then
    echo "[2/4] migraciones + seed"
    MIGRATE_OUT=\$(mktemp)
    # -T y </dev/null son OBLIGATORIOS: sin ellos \`compose run\` se queda con el
    # stdin por el que \`ssh bash -s\` está leyendo ESTE script y se traga el resto
    # (los pasos de arranque no llegaban a ejecutarse y los contenedores nunca
    # se recreaban, aunque el despliegue pareciera correcto).
    docker compose -f "$COMPOSE_FILE" run --rm -T migrate > "\$MIGRATE_OUT" 2>&1 </dev/null \
      || { echo "MIGRACIONES FALLIDAS"; tail -30 "\$MIGRATE_OUT"; cat "\$MIGRATE_OUT" >> "\$LOG"; exit 1; }
    cat "\$MIGRATE_OUT" >> "\$LOG"
    # Salvaguarda: el seed nuevo SIEMPRE imprime su modo. Si no aparece, se ha
    # ejecutado una imagen cacheada con el seed antiguo (destructivo) y hay que
    # enterarse ahora, no cuando la clienta pierda su trabajo.
    if ! grep -q "^Modo: " "\$MIGRATE_OUT"; then
      echo "ABORTADO: el seed ejecutado no es el actual (imagen 'migrate' cacheada)."
      echo "Reconstruye con: docker compose -f $COMPOSE_FILE build --no-cache migrate"
      rm -f "\$MIGRATE_OUT"; exit 1
    fi
    grep "^Modo: " "\$MIGRATE_OUT" | sed 's/^/  /'
    rm -f "\$MIGRATE_OUT"
  else
    echo "[2/4] migraciones omitidas"
  fi

  echo "[3/4] levantando $SERVICES"
  docker compose -f "$COMPOSE_FILE" up -d $SERVICES >> "\$LOG" 2>&1 </dev/null \
    || { echo "UP FALLIDO"; tail -30 "\$LOG"; exit 1; }

  # Post-condición: el contenedor DEBE estar corriendo la imagen recién
  # construida. Si no, se ha desplegado código viejo aunque todo pareciera bien.
  for svc in $SERVICES; do
    img_new=\$(docker images --no-trunc -q "nailsAurora-\${svc}:latest")
    img_run=\$(docker inspect -f '{{.Image}}' "nailsAurora-\${svc}-1" 2>/dev/null || echo "")
    if [ -n "\$img_new" ] && [ "\$img_new" != "\$img_run" ]; then
      echo "  \$svc corre una imagen distinta de la construida; forzando recreación"
      docker compose -f "$COMPOSE_FILE" up -d --force-recreate "\$svc" >> "\$LOG" 2>&1 </dev/null
      img_run=\$(docker inspect -f '{{.Image}}' "nailsAurora-\${svc}-1")
      [ "\$img_new" = "\$img_run" ] || { echo "  ✗ \$svc SIGUE con imagen antigua"; exit 1; }
    fi
    echo "  \$svc -> imagen \$(echo "\$img_run" | cut -c8-19) ✓"
  done

  echo "[4/4] esperando a que estén sanos"
  for svc in $SERVICES; do
    cname="nailsAurora-\${svc}-1"
    for i in \$(seq 1 $HEALTH_RETRIES); do
      status=\$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "\$cname" 2>/dev/null || echo "missing")
      case "\$status" in
        healthy|running) echo "  \$cname: \$status"; break ;;
        unhealthy) echo "  \$cname: UNHEALTHY"; docker logs --tail 30 "\$cname"; exit 1 ;;
      esac
      if [ \$i -eq $HEALTH_RETRIES ]; then
        echo "  \$cname no llegó a estar sano (último estado: \$status)"
        docker logs --tail 30 "\$cname"; exit 1
      fi
      sleep $HEALTH_DELAY
    done
  done
EOF
ok "Servicios construidos y arrancados"

# =============================================================================
# 5) Verificación post-despliegue (que la web responde de verdad)
# =============================================================================
say "Verificación post-despliegue"

ssh "$REMOTE_HOST" "bash -s" <<'EOF' || die "La verificación post-despliegue falló: revisa el VPS."
  set -euo pipefail
  cd /root/Fgd/DockerApps/NailsAurora
  set -a; . ./.env; set +a
  fallos=0
  for path in "/" "/login"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL$path" || echo "000")
    if [ "$code" = "200" ]; then
      echo "  ✓ $PUBLIC_URL$path -> $code"
    else
      echo "  ✗ $PUBLIC_URL$path -> $code"; fallos=$((fallos + 1))
    fi
  done
  [ "$fallos" -eq 0 ] || exit 1
EOF

ok "Despliegue completado"
printf '%s\n' "${D}Log del VPS: $REMOTE_DIR/deploy.log · copias de BD: $REMOTE_DIR/$BACKUP_SUBDIR/${N}"

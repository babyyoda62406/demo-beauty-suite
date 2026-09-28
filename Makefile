# =============================================================================
# FGD Beauty Suite — developer task runner.
# Usage: `make <target>`. Run `make help` to list targets.
# =============================================================================

# Prefer the modern `docker compose`; fall back to legacy `docker-compose`.
COMPOSE ?= docker compose
API := @fgd/api

.DEFAULT_GOAL := help
.PHONY: help up down logs ps migrate generate seed dev fmt clean setup

help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Prepara el entorno local (.env a partir de .env.example)
	@bash scripts/dev-setup.sh

up: ## Levanta toda la stack (build + up en segundo plano)
	$(COMPOSE) up -d --build

down: ## Detiene la stack y elimina los contenedores
	$(COMPOSE) down

logs: ## Sigue los logs de todos los servicios
	$(COMPOSE) logs -f --tail=100

ps: ## Lista el estado de los servicios
	$(COMPOSE) ps

migrate: ## Aplica migraciones Prisma en desarrollo (crea/actualiza el esquema)
	pnpm --filter $(API) exec prisma migrate dev

generate: ## Regenera el cliente Prisma
	pnpm --filter $(API) exec prisma generate

seed: ## Puebla la base de datos con datos de ejemplo (Aurora + plataforma)
	pnpm --filter $(API) exec prisma db seed

dev: ## Arranca API y web en modo desarrollo (turbo)
	pnpm run dev

fmt: ## Formatea el código con Prettier
	pnpm run format

clean: ## Detiene la stack y borra volúmenes, imágenes locales y artefactos de build
	$(COMPOSE) down -v --remove-orphans
	@rm -rf node_modules **/node_modules **/dist **/.next **/.turbo .turbo || true
	@echo "Limpieza completada."

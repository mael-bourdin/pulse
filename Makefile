# Commandes de PULSE V1 (spec/hosting.md, spec/testing.md). `make` seul affiche l'aide.
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Variables d'environnement locales (.env, jamais versionné).
-include .env
export

DB_NAME ?= pulse

.PHONY: help setup db test fmt lint check

help: ## Affiche cette aide
	@grep -hE '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-12s %s\n", $$1, $$2}'

setup: ## Prépare le poste : .env, hook Git, base locale
	@test -f .env || { cp .env.example .env; echo ".env créé depuis .env.example"; }
	@git config core.hooksPath .githooks
	@command -v cargo >/dev/null || { echo "Rust manquant : installer rustup (spec/hosting.md)"; exit 1; }
	@command -v psql >/dev/null || { echo "PostgreSQL manquant (Postgres.app ou brew install postgresql@16)"; exit 1; }
	@$(MAKE) --no-print-directory db
	@echo "Poste prêt."

db: ## Crée la base locale si elle n'existe pas
	@psql -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$(DB_NAME)'" | grep -q 1 \
		|| createdb $(DB_NAME) && echo "Base $(DB_NAME) disponible."

test: ## Tests unitaires, de contrat et d'intégration (PostgreSQL local requis)
	cargo test --workspace

fmt: ## Formate le code Rust
	cargo fmt --all

lint: ## Format et clippy, comme la CI
	cargo fmt --all --check
	cargo clippy --workspace --all-targets -- -D warnings

check: lint test ## Vérifications avant chaque push (complétées par TECH-08 : cargo deny, front, gitleaks)

# ============================================
# school-frontend-web · Makefile
# ============================================

.PHONY: install dev build start help

install:
	@npm install

dev:
	@echo "Starting Next.js on http://localhost:3001 ..."
	@npx next dev -p 3001

build:
	@npx next build

start:
	@npx next start -p 3001

help:
	@echo ""
	@echo "school-frontend-web commands:"
	@echo ""
	@echo "  make install    Install dependencies"
	@echo "  make dev        Start dev server (port 3001)"
	@echo "  make build      Production build"
	@echo "  make start      Start production server (port 3001)"
	@echo ""

#!/usr/bin/env bash
# Comprueba tipos, tests y builds de todo el proyecto (lo mismo que la CI).
set -euo pipefail
raiz="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ API"
cd "$raiz/backend" && npm ci --silent && npm run typecheck && npm test && npm run build

echo "▶ Panel de administración"
cd "$raiz/admin-panel" && npm ci --silent && npm run build

echo "▶ App"
cd "$raiz/frontend" && npm ci --silent && npm run typecheck

echo "✔ Todo correcto"

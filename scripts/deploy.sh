#!/usr/bin/env bash
set -euo pipefail

echo "=== Kroos Master Deploy ==="

echo ""
echo "1. Validando variables de entorno..."
cd "$(dirname "$0")/backend"
npm run check:env

echo ""
echo "2. Compilando backend..."
npm run build

echo ""
echo "3. Verificando tipos frontend..."
cd ../frontend
npm run typecheck

echo ""
echo "4. Build de producción EAS..."
eas build --profile production --platform all

echo ""
echo "Deploy completado."

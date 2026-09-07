#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Change to the root directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================="
echo "🚀 Starting Full Project Build & Restart"
echo "========================================="

# ---------------- Backend Build ----------------
echo ""
echo "📦 [1/3] Processing Backend..."
cd "$SCRIPT_DIR/backend"

echo "  -> Generating Prisma client..."
npx prisma generate

echo "  -> Pushing database schema changes..."
npx prisma db push

echo "  -> Compiling backend TypeScript..."
npm run build

echo "✅ Backend build completed successfully!"

# ---------------- Frontend Build ----------------
echo ""
echo "🎨 [2/3] Processing Frontend..."
cd "$SCRIPT_DIR/frontend"

echo "  -> Compiling frontend assets..."
npm run build

echo "✅ Frontend build completed successfully!"

# ---------------- PM2 Restart ----------------
echo ""
echo "🔄 [3/3] Restarting PM2 process 0..."
cd "$SCRIPT_DIR"
pm2 restart 0

echo ""
echo "========================================="
echo "🎉 Build & PM2 restart finished successfully!"
echo "========================================="

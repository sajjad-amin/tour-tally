#!/bin/bash

PROJECT_DIR="${1:-/var/www/tourtally}"

echo "====================================="
echo "  TourTally Deployment & Asset Builder"
echo "====================================="
echo ""

cd "$PROJECT_DIR" || { echo "Directory not found!"; exit 1; }

echo "Building Frontend Assets via Vite..."
rm -rf public/assets
cd "$PROJECT_DIR/frontend" || { echo "Frontend directory not found!"; exit 1; }
npm install --legacy-peer-deps
npm run build
cd "$PROJECT_DIR" || exit 1

echo "Updating Backend..."
composer install --no-interaction --prefer-dist --optimize-autoloader
php artisan storage:link || true

echo "Fixing Permissions..."
chmod -R 775 "$PROJECT_DIR/storage" "$PROJECT_DIR/bootstrap/cache"

echo "Clearing Caches..."
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear

echo ""
echo "====================================="
echo "  BUILD & UPDATE COMPLETED!"
echo "====================================="

#!/bin/bash

# Script to reset the project while keeping the database

echo "🔄 Resetting project..."

# Stop any running processes
echo "⏹️  Stopping dev server..."
pkill -f "next dev" || true

# Remove build artifacts and cache
echo "🗑️  Removing build artifacts..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
echo "📦 Reinstalling dependencies..."
npm install

echo "✅ Project reset complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Go to: http://localhost:3000/login"
echo "3. Test login with: admin@test.com / Admin123!"

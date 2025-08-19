#!/bin/bash

# Script to update imports after Phase 3 reorganization
# Run from project root

echo "🔄 Updating imports after Phase 3 reorganization..."

# Update database client imports
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec sed -i '' \
  -e "s|from '@/lib/database/client'|from '@/lib/core/database/client'|g" \
  -e "s|from '@/lib/database/|from '@/lib/core/database/|g" \
  {} \;

# Update auth imports
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec sed -i '' \
  -e "s|from '@/lib/auth'|from '@/lib/core/auth/auth'|g" \
  -e "s|from '@/lib/auth-client'|from '@/lib/core/auth/auth-client'|g" \
  -e "s|from '@/lib/auth-helpers'|from '@/lib/core/auth/auth-helpers'|g" \
  -e "s|from '@/lib/auth-utils'|from '@/lib/core/auth/auth-utils'|g" \
  {} \;

# Update logger imports
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec sed -i '' \
  -e "s|from '@/lib/logger'|from '@/lib/core/logger/logger'|g" \
  {} \;

# Update AI imports
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec sed -i '' \
  -e "s|from '@/lib/ai/|from '@/lib/features/ai/|g" \
  {} \;

# Update OFX imports
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec sed -i '' \
  -e "s|from '@/lib/ofx/|from '@/lib/features/ofx/|g" \
  -e "s|from '@/lib/ofx'|from '@/lib/features/ofx'|g" \
  {} \;

# Update Imobzi imports
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec sed -i '' \
  -e "s|from '@/lib/imobzi/|from '@/lib/features/imobzi/|g" \
  {} \;

# Update financial calculations imports
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec sed -i '' \
  -e "s|from '@/lib/financial-calculations'|from '@/lib/features/financial/financial-calculations'|g" \
  -e "s|from '@/lib/financial-calculations-optimized'|from '@/lib/features/financial/financial-calculations-optimized'|g" \
  {} \;

# Update component imports
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "./node_modules/*" -not -path "./.next/*" -exec sed -i '' \
  -e "s|from '@/components/auth/|from '@/components/features/auth/|g" \
  -e "s|from '@/components/ofx/|from '@/components/features/ofx/|g" \
  -e "s|from '@/components/imobzi/|from '@/components/features/imobzi/|g" \
  {} \;

echo "✅ Import updates complete!"
echo "⚠️  Please verify the changes and run tests to ensure everything works correctly."
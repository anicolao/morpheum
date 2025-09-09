#!/bin/bash

# check.sh - Comprehensive quality checks for the Morpheum project
# This script runs all the checks that should pass for a clean build

set -e  # Exit on first error

echo "🔍 Running Morpheum quality checks..."

# 1. TypeScript compilation check
echo "📝 Checking TypeScript compilation..."
npx tsc --noEmit

# 2. Run test suite
echo "🧪 Running test suite..."
npm test

# 3. Check for uncommitted changes (if in git repo)
if [ -d .git ]; then
    echo "📋 Checking for uncommitted changes..."
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo "❌ There are uncommitted changes. Please commit all changes before running checks."
        exit 1
    fi
fi

echo "✅ All checks passed!"
#!/bin/bash

# find-check-hash.sh - Find the first commit where ./check.sh started failing
# This script uses git bisect to efficiently find the regression point

set -e

echo "🔍 Finding the commit where ./check.sh started failing..."

# Function to check if check.sh exists and is executable
check_script_exists() {
    if [ ! -f "./check.sh" ]; then
        return 1
    fi
    if [ ! -x "./check.sh" ]; then
        return 1
    fi
    return 0
}

# Function to run check.sh and return appropriate exit code for git bisect
test_check_script() {
    echo "📋 Testing check.sh in commit $(git rev-parse --short HEAD)..."
    
    # If check.sh doesn't exist, this commit is "good" (before the regression)
    if ! check_script_exists; then
        echo "✅ check.sh does not exist in this commit (good - before regression)"
        exit 0  # This commit is "good"
    fi
    
    # Install dependencies if package.json exists and node_modules doesn't
    if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install --silent 2>/dev/null || true
    fi
    
    # Run the check script
    if ./check.sh >/dev/null 2>&1; then
        echo "✅ check.sh passed in this commit"
        exit 0  # This commit is "good"
    else
        echo "❌ check.sh failed in this commit"
        exit 1  # This commit is "bad"
    fi
}

# If this script is being called by git bisect, just run the test
if [ "$1" = "--test" ]; then
    test_check_script
    exit $?
fi

# Main bisect logic
echo "🚀 Starting git bisect to find when check.sh started failing..."

# Ensure we have a clean working directory
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "❌ Working directory is not clean. Please commit or stash changes first."
    exit 1
fi

# Use git bisect to find the regression point
git bisect reset 2>/dev/null || true
git bisect start
git bisect bad

# Find the oldest commit that doesn't have check.sh
ALL_COMMITS=$(git rev-list HEAD)
GOOD_COMMIT=""

for commit in $(echo "$ALL_COMMITS" | tac); do
    # Use git show to check if check.sh exists without checking out
    if ! git show "$commit:check.sh" >/dev/null 2>&1; then
        GOOD_COMMIT="$commit"
        echo "✅ Found good commit (check.sh doesn't exist): $GOOD_COMMIT"
        break
    fi
done

if [ -z "$GOOD_COMMIT" ]; then
    # If all commits have check.sh, use the oldest one and hope it works
    GOOD_COMMIT=$(echo "$ALL_COMMITS" | tail -1)
    echo "⚠️ All commits have check.sh, using oldest: $GOOD_COMMIT"
fi

git bisect good "$GOOD_COMMIT"

echo "🔄 Running git bisect with automated testing..."
git bisect run "$0" --test

# Get the result
FIRST_BAD_COMMIT=$(git bisect view --pretty=format:"%H" 2>/dev/null | head -1)

# Reset bisect
git bisect reset

# Output the result
if [ -n "$FIRST_BAD_COMMIT" ]; then
    echo ""
    echo "🎯 RESULT: First failing commit found!"
    echo "📋 Commit hash: $FIRST_BAD_COMMIT"
    echo "📝 Commit details:"
    git log --oneline -1 "$FIRST_BAD_COMMIT"
    echo ""
    echo "$FIRST_BAD_COMMIT"
else
    echo "❌ Could not determine the first failing commit"
    exit 1
fi
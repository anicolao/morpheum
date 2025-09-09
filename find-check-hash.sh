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

# Check how many commits we have
COMMIT_COUNT=$(git rev-list --count HEAD)
echo "📊 Found $COMMIT_COUNT commits in history"

# If we only have one commit, this is where check.sh was introduced
if [ "$COMMIT_COUNT" -eq 1 ]; then
    CURRENT_COMMIT=$(git rev-parse HEAD)
    echo "ℹ️ Only one commit in history."
    
    if check_script_exists; then
        if ./check.sh >/dev/null 2>&1; then
            echo "✅ check.sh works in the only commit. No regression found."
            exit 0
        else
            echo "❌ check.sh fails in the only commit where it exists."
            echo ""
            echo "🎯 RESULT: First failing commit found!"
            echo "📋 Commit hash: $CURRENT_COMMIT"
            echo "📝 Commit details:"
            git log --oneline -1 "$CURRENT_COMMIT"
            echo ""
            echo "$CURRENT_COMMIT"
            exit 0
        fi
    else
        echo "❌ check.sh doesn't exist in the only commit. Nothing to bisect."
        exit 1
    fi
fi

# Start bisect for multi-commit scenarios
git bisect reset 2>/dev/null || true  # Reset any previous bisect session
git bisect start

# Set the current commit as bad (since check.sh fails)
echo "🔴 Marking current commit as bad (check.sh fails)..."
git bisect bad

# Find a good commit by checking git history
echo "🔍 Looking for a good commit to start bisect..."

ALL_COMMITS=$(git rev-list HEAD)
GOOD_COMMIT=""

# Test commits starting from oldest
for commit in $(echo "$ALL_COMMITS" | tac); do
    echo "📅 Trying commit: $(git log --oneline -1 $commit)"
    git checkout "$commit" 2>/dev/null || continue
    
    # If check.sh doesn't exist, consider this "good" (before the feature)
    if ! check_script_exists; then
        GOOD_COMMIT="$commit"
        echo "✅ Found good commit (check.sh doesn't exist): $GOOD_COMMIT"
        break
    fi
    
    # If check.sh exists and works, this is good
    # Install dependencies if needed
    if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies for testing..."
        npm install --silent 2>/dev/null || true
    fi
    
    if ./check.sh >/dev/null 2>&1; then
        GOOD_COMMIT="$commit"
        echo "✅ Found good commit (check.sh passes): $GOOD_COMMIT"
        break
    fi
done

# If no good commit found, use the oldest commit as baseline
if [ -z "$GOOD_COMMIT" ]; then
    GOOD_COMMIT=$(echo "$ALL_COMMITS" | tail -1)
    echo "⚠️ No clearly good commit found, using oldest commit: $GOOD_COMMIT"
fi

# Go back to HEAD and set up the bisect
git checkout HEAD
git bisect bad
git bisect good "$GOOD_COMMIT"

echo "🔄 Running git bisect with automated testing..."

# Run the bisect with our test script
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
    echo "🔍 To investigate further:"
    echo "   git show $FIRST_BAD_COMMIT"
    echo "   git checkout $FIRST_BAD_COMMIT"
    echo ""
    
    # Output just the hash as requested
    echo "$FIRST_BAD_COMMIT"
else
    echo "❌ Could not determine the first failing commit"
    exit 1
fi
#!/bin/bash

# find-check-hash.sh - Find the first commit where ./check.sh started failing
# This script uses git bisect to efficiently find the regression point

set -e

echo "🔍 Finding the commit where ./check.sh started failing..."

# Function to check if check.sh exists and is executable
check_script_exists() {
    if [ ! -f "./check.sh" ]; then
        echo "❌ check.sh does not exist in this commit"
        return 1
    fi
    if [ ! -x "./check.sh" ]; then
        echo "❌ check.sh is not executable in this commit"
        return 1
    fi
    return 0
}

# Function to run check.sh and return appropriate exit code for git bisect
test_check_script() {
    # If check.sh doesn't exist or isn't executable, consider this commit as "bad"
    # since we're looking for when it started failing
    if ! check_script_exists; then
        exit 1  # This commit is "bad" - check.sh doesn't work
    fi
    
    echo "📋 Testing check.sh in commit $(git rev-parse --short HEAD)..."
    
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

# Start bisect
git bisect reset 2>/dev/null || true  # Reset any previous bisect session
git bisect start

# Set the current commit as bad (since check.sh fails)
echo "🔴 Marking current commit as bad (check.sh fails)..."
git bisect bad

# We need to find a good commit. Let's start by going back in history
# Look for the first commit that has check.sh or where basic functionality works
echo "🔍 Looking for a good commit to start bisect..."

# Try different points in history to find a good commit
GOOD_COMMIT=""
for days_back in 1 7 14 30 60 90; do
    OLD_COMMIT=$(git log --since="$days_back days ago" --format="%H" | tail -1)
    if [ -n "$OLD_COMMIT" ]; then
        echo "📅 Trying commit from $days_back days ago: $(git log --oneline -1 $OLD_COMMIT)"
        git checkout "$OLD_COMMIT" 2>/dev/null || continue
        
        # Test this commit
        if check_script_exists; then
            # Install dependencies if needed
            if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
                npm install --silent 2>/dev/null || true
            fi
            
            if ./check.sh >/dev/null 2>&1; then
                GOOD_COMMIT="$OLD_COMMIT"
                echo "✅ Found good commit: $GOOD_COMMIT"
                break
            fi
        fi
    fi
done

# If no good commit found, try the root commit
if [ -z "$GOOD_COMMIT" ]; then
    ROOT_COMMIT=$(git rev-list --max-parents=0 HEAD)
    echo "🌱 Trying root commit: $ROOT_COMMIT"
    git checkout "$ROOT_COMMIT" 2>/dev/null || true
    
    # For very old commits, check.sh might not exist, which we consider "good"
    # since the script wasn't supposed to fail yet
    GOOD_COMMIT="$ROOT_COMMIT"
    echo "✅ Using root commit as good: $GOOD_COMMIT"
fi

# Go back to the starting point and set up the bisect
git checkout HEAD
git bisect bad
git bisect good "$GOOD_COMMIT"

echo "🔄 Running git bisect with automated testing..."

# Run the bisect with our test script
git bisect run "$0" --test

# Get the result
FIRST_BAD_COMMIT=$(git bisect view --pretty=format:"%H" | head -1)

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
#!/bin/bash
echo "🔍 Scanning Git history for sensitive patterns..."

echo "--- Checking for Twilio SIDs (AC...) ---"
git log -p --all -G "AC[a-f0-9]{32}" | grep "AC[a-f0-9]\{32\}"

echo "--- Checking for 32-character Auth Tokens ---"
# This looks for 32-char hex strings which are common for Auth Tokens
git log -p --all -G "[a-f0-9]{32}" | grep -E "[a-f0-9]{32}"

echo "--- Checking for hardcoded Passwords/Secrets ---"
git log -p --all -iE "password|secret|token|api_key"

echo "✅ Scan complete."
echo "If you see output above, those commits still contain secrets."
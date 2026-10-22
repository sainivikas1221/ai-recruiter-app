#!/bin/bash
# Double-click this file to start JobPilot on a Mac.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Opening the download page: install the LTS version,"
  echo "then double-click \"Start JobPilot\" again."
  open "https://nodejs.org/en/download"
  read -r -p "Press Enter to close."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Downloading what the app needs. This happens once and takes a few minutes..."
  npm install --no-audit --no-fund || { read -r -p "Could not download everything. Press Enter to close."; exit 1; }
fi

node scripts/start.mjs

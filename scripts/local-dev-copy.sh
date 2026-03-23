#!/usr/bin/env bash
set -euo pipefail

ACT_DIR="$HOME/Projects/act"
NVIM_DIR="$HOME/Projects/act-nvim"
PACK_DIR="$HOME/.local/share/nvim/site/pack/core/opt/act-nvim"

echo "[local-dev-copy] 1. Building act-diagram..."
(cd "$ACT_DIR" && pnpm -F act-diagram build)

echo "[local-dev-copy] 2. Building act-nvim..."
(cd "$NVIM_DIR" && pnpm build)

echo "[local-dev-copy] 3. Injecting local act-diagram into act-nvim..."
rm -rf "$NVIM_DIR/node_modules/@rotorsoft/act-diagram/dist"
cp -R "$ACT_DIR/libs/act-diagram/dist" "$NVIM_DIR/node_modules/@rotorsoft/act-diagram/dist"

echo "[local-dev-copy] 4. Rebuilding act-nvim client with local act-diagram..."
rm -rf "$NVIM_DIR/node_modules/.vite"
(cd "$NVIM_DIR" && pnpm build:client)

echo "[local-dev-copy] 4. Replacing nvim pack..."
rm -rf "$PACK_DIR"
mkdir -p "$PACK_DIR"
cp -R "$NVIM_DIR/dist" "$PACK_DIR/dist"
cp -R "$NVIM_DIR/lua" "$PACK_DIR/lua"
cp "$NVIM_DIR/index.html" "$PACK_DIR/index.html"
cp "$NVIM_DIR/package.json" "$PACK_DIR/package.json"

echo "[local-dev-copy] Done"

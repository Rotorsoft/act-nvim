#!/usr/bin/env node
/**
 * Configure pnpm to use a local @rotorsoft/act-diagram instead of the published version.
 *
 * Usage:
 *   pnpm setup                          # link to ../act/libs/act-diagram
 *   pnpm setup /path/to/act-diagram     # link to a custom path
 *   pnpm setup --unlink                 # remove the override, use npm version
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const pkgPath = resolve(root, "package.json");

const arg = process.argv[2];

if (arg === "--unlink") {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  if (pkg.pnpm?.overrides?.["@rotorsoft/act-diagram"]) {
    delete pkg.pnpm.overrides["@rotorsoft/act-diagram"];
    if (Object.keys(pkg.pnpm.overrides).length === 0) delete pkg.pnpm.overrides;
    if (Object.keys(pkg.pnpm).length === 0) delete pkg.pnpm;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    console.log("[setup] Removed override — run 'pnpm install' to use npm version");
  } else {
    console.log("[setup] No override to remove");
  }
  process.exit(0);
}

const localDiagram = arg ? resolve(arg) : resolve(root, "../act/libs/act-diagram");

if (!existsSync(localDiagram)) {
  console.error(`[setup] Not found: ${localDiagram}`);
  console.error("[setup] Usage: pnpm setup [/path/to/act-diagram]");
  process.exit(1);
}

console.log("[setup] Linking to", localDiagram);

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
pkg.pnpm = pkg.pnpm || {};
pkg.pnpm.overrides = pkg.pnpm.overrides || {};
pkg.pnpm.overrides["@rotorsoft/act-diagram"] = `link:${localDiagram}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
console.log("[setup] Override set — run 'pnpm install && pnpm build' to apply");

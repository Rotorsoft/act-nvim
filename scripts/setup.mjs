#!/usr/bin/env node
/**
 * Auto-detects the local act monorepo and configures pnpm overrides
 * to use the local @rotorsoft/act-diagram instead of the published version.
 *
 * Run automatically via postinstall, or manually: pnpm setup
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const localDiagram = resolve(root, "../act/libs/act-diagram");

const isDevMode = existsSync(localDiagram);

if (isDevMode) {
  console.log("[setup] Found local act-diagram at", localDiagram);
  console.log("[setup] Configuring pnpm override for dev mode");

  // Update package.json with pnpm overrides
  const pkgPath = resolve(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

  const override = `link:${localDiagram}`;
  const current = pkg.pnpm?.overrides?.["@rotorsoft/act-diagram"];

  if (current !== override) {
    pkg.pnpm = pkg.pnpm || {};
    pkg.pnpm.overrides = pkg.pnpm.overrides || {};
    pkg.pnpm.overrides["@rotorsoft/act-diagram"] = override;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    console.log("[setup] Set pnpm override:", override);
    console.log("[setup] Run 'pnpm install' to apply");
  } else {
    console.log("[setup] Override already configured");
  }

  // Build act-diagram if not built
  const diagramDist = resolve(localDiagram, "dist");
  if (!existsSync(diagramDist)) {
    console.log("[setup] Building local act-diagram...");
    execSync("pnpm build", { cwd: localDiagram, stdio: "inherit" });
  }
} else {
  console.log("[setup] No local act monorepo found — using published @rotorsoft/act-diagram");

  // Remove pnpm overrides if present
  const pkgPath = resolve(root, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

  if (pkg.pnpm?.overrides?.["@rotorsoft/act-diagram"]) {
    delete pkg.pnpm.overrides["@rotorsoft/act-diagram"];
    if (Object.keys(pkg.pnpm.overrides).length === 0) delete pkg.pnpm.overrides;
    if (Object.keys(pkg.pnpm).length === 0) delete pkg.pnpm;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
    console.log("[setup] Removed pnpm override — will use npm version");
  }
}


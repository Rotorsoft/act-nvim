import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server/relay.ts"],
  format: ["cjs"],
  outDir: "dist/server",
  target: "node22",
  clean: true,
  sourcemap: true,
  minify: false,
  noExternal: ["ws"], // bundle ws — no runtime npm deps needed
});

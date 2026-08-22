// Build script for the jiscribe CLI.
// Bundles src/index.ts into the single ESM file dist/index.mjs that `bin` points at.
//   node build.mjs

import { chmodSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

import { buildHarness } from "./buildHarness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outfile = join(__dirname, "dist", "index.mjs");

rmSync(join(__dirname, "dist"), { recursive: true, force: true });
mkdirSync(join(__dirname, "dist"), { recursive: true });

const harness = await buildHarness();
console.log(
	`Built ${harness.outDir} (${harness.fontCount} font files served from node_modules)`,
);

await esbuild.build({
	entryPoints: [join(__dirname, "src", "index.ts")],
	bundle: true,
	outfile,
	format: "esm",
	platform: "node",
	// The Node the repository targets (package.json engines of the workspace root).
	target: "node22",
	sourcemap: true,
	minify: true,
	// fontkit reads font files through node:fs and picks its entry by export
	// condition; bundling it would take the browser build, which has no openSync.
	// playwright-core is external for a different reason: it is only reached by the
	// render command's dynamic import, and bundling it would make every other
	// command pay for a browser driver it never uses. Both are resolved from
	// node_modules beside dist/, as are the font packages and the schema.
	external: ["fontkit", "playwright-core"],
	banner: { js: "#!/usr/bin/env node" },
});

// `bin` targets are executed directly, so the file has to carry the bit itself:
// a consumer installing the package gets a symlink to it, not a copy.
chmodSync(outfile, 0o755);

console.log(`Built ${outfile}`);

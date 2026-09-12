// Build script for the e2e tests.
// Bundles e2e/**/*.test.ts into out/e2e/, one CommonJS file per test, which mocha
// loads inside a real VSCode's extension host (.vscode-test.mjs).
// Run: node build-e2e.mjs
//
// Separate from build.mjs because nothing here ships: dist/ is the vsix, out/ never
// leaves the working tree (.vscodeignore).

import { readdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import * as esbuild from "esbuild";

// __dirname is unavailable in ES modules, so derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const e2eDir = join(__dirname, "e2e");
const outDir = join(__dirname, "out", "e2e");

// One bundle per test file rather than one for all of them: mocha reports the file a
// failure came from, and the suites share only the helpers under support/.
const entryPoints = readdirSync(e2eDir, { recursive: true })
	.map((name) => String(name))
	.filter((name) => name.endsWith(".test.ts"))
	.map((name) => join(e2eDir, name));

if (entryPoints.length === 0) {
	console.error(`No *.test.ts found under ${e2eDir}`);
	process.exit(1);
}

try {
	// Drop the previous output, so a renamed or deleted test cannot keep running
	// from a stale bundle.
	rmSync(outDir, { recursive: true, force: true });

	await esbuild.build({
		entryPoints,
		// Keeps the bundle names flat next to the sources' own layout
		outbase: e2eDir,
		outdir: outDir,
		// The tests import workspace packages (@jiscribe/doc/...) to build fixtures,
		// and node resolves nothing from out/, so everything goes into the bundle
		bundle: true,
		// vscode: injected by the extension host.
		// mocha: the runner owns the instance whose globals (describe / it) these
		// files use; a second copy in the bundle would register into nothing.
		external: ["vscode", "mocha"],
		format: "cjs",
		platform: "node",
		// Node.js version to target (matches the one shipped with VSCode 1.85)
		target: "node18",
		// Never minified: a stack trace from a failing assertion is the whole point
		sourcemap: true,
	});

	console.log(`e2e test build completed: ${entryPoints.length} file(s)`);
} catch (error) {
	console.error("e2e test build failed:", error);
	// Exit with code 1 on failure, so test:e2e stops before launching VSCode
	process.exit(1);
}

// Build script for the VSCode extension.
// Bundles the TypeScript/TSX sources into dist/ with esbuild.
// Normal build: node build.mjs
// Watch mode:   node build.mjs --watch

import { copyFileSync, mkdirSync, readdirSync, rmSync } from "fs";
import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import * as esbuild from "esbuild";

// __dirname is unavailable in ES modules, so derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start in watch mode when --watch is passed on the command line
const isWatch = process.argv.includes("--watch");

// ── Extension host build (runs in Node.js) ───────────────────────────────
// The extension's main process runs on the Node.js bundled with VSCode.
// src/extension.ts is bundled into the single file dist/extension.js.
const extensionConfig = {
	// Bundle entry point
	entryPoints: [join(__dirname, "src", "extension.ts")],
	// Pull imported files and libraries into one file
	bundle: true,
	// Output path
	outfile: join(__dirname, "dist", "extension.js"),
	// Modules left out of the bundle and resolved with require() at runtime.
	// vscode: provided by the host, so it must not be bundled
	external: ["vscode"],
	// Emit CommonJS, since VSCode loads extensions with require()
	format: "cjs",
	// Node.js target (process, __dirname and friends are available)
	platform: "node",
	// Node.js version to target (matches the one shipped with VSCode 1.85)
	target: "node18",
	// Emit source maps so errors point at the original TypeScript line
	sourcemap: true,
	// Minify only for production builds, never in watch mode
	minify: !isWatch,
};

// ── Keeping only the woff2 of each face ──────────────────────────────────
// @fontsource and KaTeX name every face more than once, newest format first:
// `src: url(...woff2) format('woff2'), url(...woff) format('woff')`. esbuild's file
// loader copies whatever a url() names, so all of them land in dist/fonts/ — 28 MB of
// legacy woff for the bundled font set alone, none of it ever fetched, because a VSCode
// webview is Chromium and Chromium has read woff2 since 2014.
//
// The rewrite happens before esbuild reads the file, which is what keeps the copies out:
// dropping them from dist/ afterwards would leave the url() in webview.css pointing at
// nothing. A face that offers no woff2 is left as it is, so a dependency shipping only
// woff or ttf still resolves.
const woff2OnlyPlugin = {
	name: "woff2-only",
	setup(build) {
		build.onLoad({ filter: /\.css$/ }, async (args) => {
			const source = await readFile(args.path, "utf8");
			// The split leaves commas inside url(...) alone; unicode-range is a declaration
			// of its own, so bounding the value at ; or } keeps its commas out of reach.
			const contents = source.replace(
				/src:\s*([^;}]+)/g,
				(declaration, list) => {
					const sources = list.split(/,(?![^(]*\))/);
					const woff2 = sources.filter((one) =>
						/format\(\s*['"]woff2['"]\s*\)/.test(one),
					);
					if (woff2.length === 0 || woff2.length === sources.length) {
						return declaration;
					}
					return `src: ${woff2.map((one) => one.trim()).join(", ")}`;
				},
			);
			return { contents, loader: "css", resolveDir: dirname(args.path) };
		});
	},
};

// ── Webview build (runs in a browser environment) ────────────────────────
// The UI shown inside the VSCode panel (the SVG canvas) runs in a webview.
// A webview is a browser environment, so it needs a browser-targeted bundle.
// src/webview/index.tsx is bundled into dist/webview.js
// (imported CSS is emitted separately as dist/webview.css, fonts into dist/fonts/).
const webviewConfig = {
	// Bundle entry point (the root React component)
	entryPoints: [join(__dirname, "src", "webview", "index.tsx")],
	bundle: true,
	// Output path
	outfile: join(__dirname, "dist", "webview.js"),
	// Emit an IIFE, so the bundle loads into the webview without polluting globals
	format: "iife",
	// Browser target (window, document and friends are available)
	platform: "browser",
	// Minimum browser version (the VSCode webview is Chromium-based, so this is generous)
	target: "es2020",
	sourcemap: true,
	minify: !isWatch,
	// Use React's automatic JSX transform,
	// which lets each file use JSX without "import React from 'react'"
	jsx: "automatic",
	// How each file extension is handled.
	// css: KaTeX styles (required, since math is laid out as KaTeX HTML + CSS).
	//      esbuild collects CSS imported from JS into dist/webview.css, named
	//      after outfile. The <link> in webviewHtml.ts loads it.
	// woff2/woff/ttf: the font files referenced by @font-face in the canvas font set
	//      and in katex.min.css. The file loader copies them into dist/fonts/ and
	//      rewrites url() in the CSS to a relative path (the webview CSP already allows
	//      cspSource for font-src). Only the woff2 of a face survives woff2OnlyPlugin;
	//      the other two loaders are what a face offering no woff2 falls back on.
	loader: {
		".tsx": "tsx",
		".ts": "ts",
		".css": "css",
		".woff2": "file",
		".woff": "file",
		".ttf": "file",
	},
	assetNames: "fonts/[name]-[hash]",
	plugins: [woff2OnlyPlugin],
};

// ── Guarding the woff2-only rewrite ──────────────────────────────────────
// The rewrite above is silent by nature: word `src` differently in a future @fontsource
// release and the plugin stops matching, the legacy copies come back, and nothing says so
// — which is exactly how 28 MB of them got into the package unnoticed. So the build fails
// on the one condition the plugin exists to prevent: the same face copied as woff2 *and*
// as a legacy format. A face that offers no woff2 is the case the plugin deliberately
// leaves alone, and it passes.
function assertNoRedundantFontFormats() {
	const fileNames = readdirSync(join(__dirname, "dist", "fonts"));
	// assetNames appends "-[hash]" to every copied file, so the face is what is left of the
	// name once that suffix and the extension are gone.
	const faceOf = (fileName) => fileName.replace(/-[A-Z0-9]+\.[a-z0-9]+$/, "");
	const woff2Faces = new Set(
		fileNames.filter((name) => name.endsWith(".woff2")).map(faceOf),
	);
	const redundant = fileNames.filter(
		(name) =>
			(name.endsWith(".woff") || name.endsWith(".ttf")) &&
			woff2Faces.has(faceOf(name)),
	);
	if (redundant.length > 0) {
		throw new Error(
			`woff2OnlyPlugin stopped stripping the legacy src: ${redundant.length} file(s) ` +
				`duplicate a face that also ships woff2, starting with ${redundant[0]}. ` +
				`Check how the @font-face src is written in the CSS it comes from.`,
		);
	}
}

// ── Copying the AI assets ────────────────────────────────────────────────
// Place the doc-schema package's distributable assets (assets/) into dist/.
// - jiscribe.schema.json: referenced by VSCode's jsonValidation to provide
//   completion and validation for .jis.json.
// - ai-guide.md: the AI authoring guide (entry point) that "Set up AI" writes
//   into the workspace.
// - reference.md: the detailed reference that ai-guide links to (it lands in the
//   same .jiscribe/ directory, so the link resolves).
// The source is packages/doc-schema/assets/ (the canonical distributable assets,
// generated by pnpm generate:schema).
function copyAiAssets() {
	const aiDir = join(__dirname, "../../packages/doc-schema/assets");
	const distDir = join(__dirname, "dist");
	mkdirSync(distDir, { recursive: true });

	for (const fileName of [
		"jiscribe.schema.json",
		"ai-guide.md",
		"reference.md",
	]) {
		copyFileSync(join(aiDir, fileName), join(distDir, fileName));
		console.log(`✅ AI asset copied: ${fileName}`);
	}
}

// ── Main build routine ───────────────────────────────────────────────────
async function build() {
	try {
		// Empty dist before building outside watch mode, so leftovers from earlier
		// builds (stale output, experiment files) cannot leak into the vsix
		if (!isWatch) {
			rmSync(join(__dirname, "dist"), { recursive: true, force: true });
		}

		copyAiAssets();

		if (isWatch) {
			// Watch mode: detect file changes and rebuild automatically.
			// esbuild.context() registers a build config, watch() starts watching.
			// The extension host and the webview are watched in parallel.
			const extensionCtx = await esbuild.context(extensionConfig);
			const webviewCtx = await esbuild.context(webviewConfig);

			await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);

			console.log("Watching for changes...");
		} else {
			// Normal build: build once and exit.
			// The extension host and the webview are built in sequence.
			await esbuild.build(extensionConfig);
			await esbuild.build(webviewConfig);
			assertNoRedundantFontFormats();

			console.log("Build completed successfully");
		}
	} catch (error) {
		console.error("Build failed:", error);
		// Exit with code 1 on failure, so CI and vscode:prepublish detect the error
		process.exit(1);
	}
}

build();

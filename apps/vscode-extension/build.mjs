import * as esbuild from "esbuild";
import { copyFileSync, cpSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWatch = process.argv.includes("--watch");

// Build extension (Node.js environment)
const extensionConfig = {
	entryPoints: [join(__dirname, "src", "extension.ts")],
	bundle: true,
	outfile: join(__dirname, "dist", "extension.js"),
	external: ["vscode", "jsonc-parser"],
	format: "cjs",
	platform: "node",
	target: "node18",
	sourcemap: true,
	minify: !isWatch,
};

// Build webview (Browser environment)
const webviewConfig = {
	entryPoints: [join(__dirname, "src", "webview", "index.tsx")],
	bundle: true,
	outfile: join(__dirname, "dist", "webview.js"),
	format: "iife",
	platform: "browser",
	target: "es2020",
	sourcemap: true,
	minify: !isWatch,
	jsxFactory: "React.createElement",
	jsxFragment: "React.Fragment",
	loader: {
		".tsx": "tsx",
		".ts": "ts",
		".md": "text",
	},
};

function copySchema() {
	const src = join(__dirname, "../../packages/svg-canvas-2/src/schemas/canvas/canvas-doc.schema.json");
	const dest = join(__dirname, "dist", "canvas-doc.schema.json");
	copyFileSync(src, dest);
	console.log("✅ Schema copied: canvas-doc.schema.json");
}

// jsonc-parser uses a UMD format that esbuild cannot properly inline.
// Copy it directly into dist/node_modules so runtime require() resolves correctly.
function copyJsoncParser() {
	const src = join(__dirname, "node_modules", "jsonc-parser");
	const dest = join(__dirname, "dist", "node_modules", "jsonc-parser");
	mkdirSync(join(__dirname, "dist", "node_modules"), { recursive: true });
	cpSync(src, dest, { recursive: true, dereference: true });
	console.log("✅ jsonc-parser copied to dist/node_modules");
}

async function build() {
	try {
		copySchema();
		copyJsoncParser();

		if (isWatch) {
			const extensionCtx = await esbuild.context(extensionConfig);
			const webviewCtx = await esbuild.context(webviewConfig);

			await extensionCtx.watch();
			await webviewCtx.watch();

			console.log("Watching for changes...");
		} else {
			await esbuild.build(extensionConfig);
			await esbuild.build(webviewConfig);

			console.log("Build completed successfully");
		}
	} catch (error) {
		console.error("Build failed:", error);
		process.exit(1);
	}
}

build();

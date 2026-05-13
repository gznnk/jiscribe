import * as esbuild from "esbuild";
import { copyFileSync } from "fs";
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
	const dest = join(__dirname, "canvas-doc.schema.json");
	copyFileSync(src, dest);
	console.log("✅ Schema copied: canvas-doc.schema.json");
}

async function build() {
	try {
		copySchema();

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

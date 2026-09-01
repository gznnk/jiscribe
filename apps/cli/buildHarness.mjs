// Builds the render harness: the self-contained page playwright loads, carrying the
// Canvas and the standard shape set (@jiscribe/standard-shapes).
//
// Font files are deliberately NOT copied into dist. The shipped stacks are split by
// unicode-range into some 850 files (Noto Sans JP alone is 125 subsets per weight),
// which is 50 MB beside a 600 KB CLI. Instead every url() in the stylesheets is
// rewritten to a stable `/fonts/<name>` path and recorded in fonts.json against the
// package specifier it came from; the render command serves those paths out of
// node_modules through playwright's request interception (see harnessAssets.ts).

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { woff2OnlyEsbuildPlugin } from "@jiscribe/canvas/build/woff2-only";
import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Where an absolute path inside node_modules sits, as a specifier Node can resolve. */
const toPackageSpecifier = (absolutePath) => {
	const normalized = absolutePath.split("\\").join("/");
	const marker = "/node_modules/";
	const lastIndex = normalized.lastIndexOf(marker);
	return lastIndex === -1 ? null : normalized.slice(lastIndex + marker.length);
};

/**
 * Leaves every font (and any other binary asset a stylesheet names) out of the
 * bundle, under a path the render command can serve, and collects the mapping.
 */
const createAssetPlugin = (manifest) => ({
	name: "externalize-font-assets",
	setup(build) {
		build.onResolve({ filter: /\.(woff2?|ttf|otf|eot)$/ }, (args) => {
			const absolutePath = resolve(args.resolveDir, args.path.split("?")[0]);
			const specifier = toPackageSpecifier(absolutePath);
			const name = absolutePath.split("/").pop();
			const servedPath = `/fonts/${name}`;
			// A file outside node_modules has no specifier to resolve later; there is
			// none in the shipped stacks, and one appearing should be loud.
			if (specifier === null) {
				throw new Error(
					`font outside node_modules cannot be served: ${absolutePath}`,
				);
			}
			manifest[servedPath] = specifier;
			return { path: servedPath, external: true };
		});
	},
});

export const buildHarness = async ({ minify = true } = {}) => {
	const outDir = join(__dirname, "dist", "harness");
	mkdirSync(outDir, { recursive: true });

	const fontManifest = {};
	await esbuild.build({
		entryPoints: [join(__dirname, "harness", "main.tsx")],
		bundle: true,
		outfile: join(outDir, "harness.js"),
		format: "esm",
		platform: "browser",
		// The browsers the render command drives are current Chromium builds.
		target: "es2022",
		jsx: "automatic",
		minify,
		sourcemap: false,
		// The page never runs in a Node-conditioned resolver, and a dev build of
		// React would only make the harness slower and noisier.
		define: { "process.env.NODE_ENV": '"production"' },
		loader: { ".css": "css" },
		// woff2 first, so the manifest records one file per face instead of the two or
		// three the stylesheets declare, and the render command never serves a format
		// the Chromium it drives would not pick.
		plugins: [woff2OnlyEsbuildPlugin(), createAssetPlugin(fontManifest)],
	});

	writeFileSync(
		join(outDir, "fonts.json"),
		`${JSON.stringify(fontManifest, null, 2)}\n`,
	);
	copyFileSync(
		join(__dirname, "harness", "index.html"),
		join(outDir, "index.html"),
	);

	return { outDir, fontCount: Object.keys(fontManifest).length };
};

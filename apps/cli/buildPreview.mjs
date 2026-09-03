// Builds the preview page: the script and the stylesheet the `preview` command
// wraps a document in. Bundled here rather than at run time so the CLI keeps
// shipping as one file plus its assets, and so a preview costs a JSON injection
// instead of a bundler run.
//
// Everything the page needs is folded in, fonts included — katex's faces as data
// URIs, the shipped stacks as a Google Fonts link the page writes (see
// previewBridge.ts). Nothing may be left pointing at a file beside the page: the
// output is one HTML file that has to work on its own.

import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Names the build is allowed to emit; anything else means an asset escaped. */
const EXPECTED_OUTPUTS = ["preview.js", "preview.css"];

/**
 * Drops the `src` entries left behind by the faces that are not carried.
 *
 * The `empty` loader rewrites a dropped file to `url()`, and an empty url is not
 * nothing to a browser: it resolves against the document, so every such entry is
 * a request for the preview file itself, answered with HTML that is not a font.
 * The entry is removed instead, format() and joining comma included.
 */
const dropEmptyFontSources = (css) =>
	css
		.replace(/,?\s*url\(\)\s*(?:format\([^)]*\))?/g, "")
		// A dropped first entry would leave the colon against a comma.
		.replace(/src:\s*,/g, "src:");

export const buildPreview = async ({ minify = true } = {}) => {
	const outDir = join(__dirname, "dist", "preview");
	mkdirSync(outDir, { recursive: true });

	const result = await esbuild.build({
		entryPoints: [join(__dirname, "preview", "main.tsx")],
		bundle: true,
		outfile: join(outDir, "preview.js"),
		write: false,
		format: "iife",
		platform: "browser",
		// Whatever the person opening the file has; a current browser either way.
		target: "es2022",
		jsx: "automatic",
		minify,
		sourcemap: false,
		// The page never runs in a Node-conditioned resolver, and a development
		// build of React would only make the file bigger and noisier.
		define: { "process.env.NODE_ENV": '"production"' },
		loader: {
			".css": "css",
			// katex ships each face as woff2, woff and ttf; carrying the woff2 alone
			// is every browser that can run this page, at a third of the bytes.
			".woff2": "dataurl",
			".woff": "empty",
			".ttf": "empty",
		},
	});

	const emitted = result.outputFiles.map((file) =>
		file.path.split(/[\\/]/).pop(),
	);
	const unexpected = emitted.filter((name) => !EXPECTED_OUTPUTS.includes(name));
	if (unexpected.length > 0) {
		throw new Error(
			`preview build emitted files that cannot travel inside one HTML: ${unexpected.join(", ")}`,
		);
	}
	const decoder = new TextDecoder();
	for (const file of result.outputFiles) {
		if (!file.path.endsWith(".css")) {
			writeFileSync(file.path, file.contents);
			continue;
		}
		const css = dropEmptyFontSources(decoder.decode(file.contents));
		if (css.includes("url()")) {
			throw new Error(
				"preview stylesheet still points at a file that is not carried (url())",
			);
		}
		writeFileSync(file.path, css);
	}

	return {
		outDir,
		scriptBytes: statSync(join(outDir, "preview.js")).size,
		styleBytes: statSync(join(outDir, "preview.css")).size,
	};
};

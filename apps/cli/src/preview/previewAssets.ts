import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Where the built preview page sits, tried in order.
 *
 * Two candidates because this module is read from two places: `dist/index.mjs`,
 * where the page is the sibling directory the build put it in, and the TypeScript
 * source under `src/preview`, which the tests run from and which has to reach
 * across to `dist`.
 */
export const PREVIEW_DIR_CANDIDATES = [
	join(dirname(fileURLToPath(import.meta.url)), "preview"),
	join(dirname(fileURLToPath(import.meta.url)), "..", "..", "dist", "preview"),
];

/** The two files the page is assembled from, as text ready to inline. */
export type PreviewAssets = {
	/** The bundled page script, with react and the shape set folded in. */
	script: string;
	/** The stylesheet the bundle emitted, katex's faces inlined as data URIs. */
	style: string;
};

/**
 * Reads the built page.
 *
 * @returns The script and the stylesheet, to be written into one HTML file
 * @throws When the page has not been built, naming both places it looked — the
 *   command cannot fall back to anything, and a file with no canvas in it would
 *   be a worse answer than a message saying what to run
 */
export const readPreviewAssets = (): PreviewAssets => {
	for (const candidate of PREVIEW_DIR_CANDIDATES) {
		try {
			return {
				script: readFileSync(join(candidate, "preview.js"), "utf8"),
				style: readFileSync(join(candidate, "preview.css"), "utf8"),
			};
		} catch {
			continue;
		}
	}
	throw new Error(
		`the preview page has not been built (looked in ${PREVIEW_DIR_CANDIDATES.join(" and ")}) — run \`pnpm build:cli\``,
	);
};

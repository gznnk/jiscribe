// Resolves where the built viewer is.
//
// vite build emits only two things: an index.html with the JS and CSS folded into
// it, and the fonts its CSS refers to (assets/). The former is read in full at
// startup and held in memory; the latter is served as the directory it is (50MB in
// total, far more than can be folded in).

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CanvasHostError } from "./canvasHostError";

export type ViewerAssets = {
	/** The whole HTML returned at `/` */
	viewerHtml: string;
	/**
	 * The SHA-256 of each inline script in viewerHtml, base64, in document order:
	 * what the page's Content-Security-Policy names so that those scripts run and
	 * no other inline script does
	 */
	viewerScriptHashes: readonly string[];
	/** The directory served under `/assets/` (absolute path) */
	assetRootPath: string;
};

const SCRIPT_ELEMENT_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

/**
 * Hashes every inline script in the HTML the way a CSP `'sha256-…'` source wants
 * it: over the script's text exactly as served, encoded as UTF-8.
 *
 * @param html The page as it is sent. A `<script src>` is skipped, whatever text
 *   it carries, since the browser runs the file and not the text
 * @returns Base64 digests in document order, empty when the page has no inline script
 */
export const calcInlineScriptHashes = (html: string): readonly string[] =>
	Array.from(html.matchAll(SCRIPT_ELEMENT_PATTERN))
		.filter(
			([, attributes, scriptText]) =>
				!/\bsrc\s*=/i.test(attributes) && scriptText.trim() !== "",
		)
		.map(([, , scriptText]) =>
			createHash("sha256").update(scriptText, "utf8").digest("base64"),
		);

/**
 * The candidate locations of the viewer, in the order they are looked for.
 *
 * Once bundled it is the client/ beside dist/index.mjs. Started from src with tsx
 * there is nothing there, so it drops to the package's dist/client (which means a
 * development start shows a screen too, as long as a build exists).
 */
const calcViewerRootCandidates = (): readonly string[] => {
	const override = process.env.JISCRIBE_MCP_VIEWER_ROOT;
	if (override !== undefined && override !== "") {
		return [path.resolve(override)];
	}
	return [
		fileURLToPath(new URL("./client/", import.meta.url)),
		fileURLToPath(new URL("../../dist/client/", import.meta.url)),
	];
};

/**
 * Reads the viewer's HTML and returns it along with where the assets are.
 *
 * @returns The HTML already read in, the hashes of its inline scripts, and the
 *   directory the fonts are served from
 * @throws CanvasHostError When it has not been built, or built without being folded
 *   into one file. Quietly going on returning 404s or a page whose script the
 *   policy refuses tells nobody anything beyond "the screen is blank", so it fails
 *   at startup
 */
export function resolveViewerAssets(): ViewerAssets {
	const candidates = calcViewerRootCandidates();
	for (const rootPath of candidates) {
		const htmlPath = path.join(rootPath, "index.html");
		if (existsSync(htmlPath)) {
			const viewerHtml = readFileSync(htmlPath, "utf8");
			const viewerScriptHashes = calcInlineScriptHashes(viewerHtml);
			// A vite build that build.mjs has not folded refers to its script by src,
			// which the policy does not let run: a blank page with a console error,
			// the quiet failure this function exists to refuse
			if (viewerScriptHashes.length === 0) {
				throw new CanvasHostError(
					`canvas viewer at ${htmlPath} holds no inline script, so it was built without build.mjs folding it. Run \`pnpm --filter jiscribe-mcp build\`.`,
				);
			}
			return {
				viewerHtml,
				viewerScriptHashes,
				assetRootPath: path.join(rootPath, "assets"),
			};
		}
	}
	throw new CanvasHostError(
		`canvas viewer is not built (looked for index.html in ${candidates.join(", ")}). Run \`pnpm --filter jiscribe-mcp build\`, or set JISCRIBE_MCP_VIEWER_ROOT to a directory holding one.`,
	);
}

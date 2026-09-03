// Resolves where the built viewer is.
//
// vite build emits only two things: an index.html with the JS and CSS folded into
// it, and the fonts its CSS refers to (assets/). The former is read in full at
// startup and held in memory; the latter is served as the directory it is (50MB in
// total, far more than can be folded in).

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CanvasHostError } from "./canvasHostError";

export type ViewerAssets = {
	/** The whole HTML returned at `/` */
	viewerHtml: string;
	/** The directory served under `/assets/` (absolute path) */
	assetRootPath: string;
};

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
 * @returns The HTML already read in, and the directory the fonts are served from
 * @throws CanvasHostError When it has not been built. Quietly going on returning
 *   404s tells nobody anything beyond "the screen is blank", so it fails at startup
 */
export function resolveViewerAssets(): ViewerAssets {
	const candidates = calcViewerRootCandidates();
	for (const rootPath of candidates) {
		const htmlPath = path.join(rootPath, "index.html");
		if (existsSync(htmlPath)) {
			return {
				viewerHtml: readFileSync(htmlPath, "utf8"),
				assetRootPath: path.join(rootPath, "assets"),
			};
		}
	}
	throw new CanvasHostError(
		`canvas viewer is not built (looked for index.html in ${candidates.join(", ")}). Run \`pnpm --filter jiscribe-mcp build\`, or set JISCRIBE_MCP_VIEWER_ROOT to a directory holding one.`,
	);
}

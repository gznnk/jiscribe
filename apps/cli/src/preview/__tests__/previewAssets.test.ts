import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PREVIEW_DIR_CANDIDATES, readPreviewAssets } from "../previewAssets";

// The same candidates the reader resolves against, so the two cannot disagree
// about whether the page is built (`pnpm build:cli`).
const isPreviewBuilt = PREVIEW_DIR_CANDIDATES.some((dir) =>
	existsSync(join(dir, "preview.js")),
);

describe.skipIf(!isPreviewBuilt)("readPreviewAssets", () => {
	it("reads a bundle with the canvas in it", () => {
		const assets = readPreviewAssets();
		expect(assets.script.length).toBeGreaterThan(100_000);
		expect(assets.style.length).toBeGreaterThan(0);
	});

	it("leaves nothing in the stylesheet pointing outside the file", () => {
		// Every font katex names has to have been folded in as a data URI: a
		// relative url() would resolve against wherever the preview was saved,
		// which is the one thing the output may not depend on.
		const urls = readPreviewAssets().style.match(/url\(([^)]*)\)/g) ?? [];
		for (const url of urls) {
			expect(url).toMatch(/^url\(["']?data:/);
		}
	});
});

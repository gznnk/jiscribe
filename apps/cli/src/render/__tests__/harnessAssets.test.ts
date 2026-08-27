import { existsSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
	createHarnessAssetHandler,
	HARNESS_DIR_CANDIDATES,
} from "../harnessAssets";

// The same candidates the handler resolves against, so the two cannot disagree about
// whether the harness is built (a build into src/render/harness used to read as unbuilt).
const isHarnessBuilt = HARNESS_DIR_CANDIDATES.some((dir) =>
	existsSync(join(dir, "fonts.json")),
);

describe.skipIf(!isHarnessBuilt)("createHarnessAssetHandler", () => {
	// Built in a hook, not in the describe body: vitest runs the body to collect the
	// tests even when skipIf skips them, so constructing here throws on an unbuilt
	// harness before the skip can apply, and the suite fails to collect.
	let serve: ReturnType<typeof createHarnessAssetHandler>;
	beforeAll(() => {
		serve = createHarnessAssetHandler();
	});

	it("serves the page and its script with the content types a browser needs", () => {
		expect(serve("/index.html")?.contentType).toBe("text/html; charset=utf-8");
		expect(serve("/harness.js")?.contentType).toBe(
			"text/javascript; charset=utf-8",
		);
		expect(serve("/harness.css")?.contentType).toBe("text/css; charset=utf-8");
	});

	it("serves the root as the page", () => {
		expect(serve("/")?.body.equals(serve("/index.html")!.body)).toBe(true);
	});

	it("serves a font out of node_modules, as a real font file", () => {
		const font = serve("/fonts/source-sans-3-latin-400-normal.woff2");
		expect(font?.contentType).toBe("font/woff2");
		// wOF2 — the file really is the woff2 the stylesheet asked for, not an
		// error page or a stale copy.
		expect(font?.body.subarray(0, 4).toString("latin1")).toBe("wOF2");
	});

	it("has nothing for a font the harness never referenced", () => {
		expect(serve("/fonts/not-a-real-font.woff2")).toBeNull();
	});

	it("refuses to walk out of the harness directory", () => {
		expect(serve("/../package.json")).toBeNull();
		expect(serve("/subdir/thing.js")).toBeNull();
	});
});

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createHarnessAssetHandler } from "../harnessAssets";

const isHarnessBuilt = existsSync(
	join(
		dirname(fileURLToPath(import.meta.url)),
		"../../../dist/harness/fonts.json",
	),
);

describe.skipIf(!isHarnessBuilt)("createHarnessAssetHandler", () => {
	const serve = createHarnessAssetHandler();

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

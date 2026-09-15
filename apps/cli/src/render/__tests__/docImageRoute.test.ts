import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { toHarnessDocImageUrl } from "../../../harness/harnessBridge";
import { createDocImageHandler } from "../docImageRoute";
import { HARNESS_ORIGIN, type HarnessAsset } from "../harnessAssets";

/** Bytes standing in for a real file; only their identity matters here. */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * A document directory holding the files a `src` could name: one beside the
 * document, one a level down, one whose name needs escaping in a URL, and one
 * the canvas cannot draw.
 */
const workDir = mkdtempSync(join(tmpdir(), "jiscribe-doc-images-"));
const docDir = join(workDir, "doc");
mkdirSync(join(docDir, "images"), { recursive: true });
writeFileSync(join(docDir, "logo.png"), PNG_BYTES);
writeFileSync(join(docDir, "photo.JPG"), PNG_BYTES);
writeFileSync(join(docDir, "mark.svg"), "<svg />");
writeFileSync(join(docDir, "my logo.png"), PNG_BYTES);
writeFileSync(join(docDir, "images", "nested.png"), PNG_BYTES);
writeFileSync(join(docDir, "notes.txt"), "not an image");
// Outside the document's directory, and readable: a `..` being refused is then
// the check working rather than the file simply not being there.
writeFileSync(join(workDir, "outside.png"), PNG_BYTES);

afterAll(() => {
	rmSync(workDir, { recursive: true, force: true });
});

describe("createDocImageHandler", () => {
	const reportedReasons: string[] = [];
	const serve = createDocImageHandler(docDir, (reason) => {
		reportedReasons.push(reason);
	});
	/** The request the page makes for `src`, exactly as the page builds it. */
	const requestFor = (src: string): HarnessAsset | null =>
		serve(new URL(toHarnessDocImageUrl(src), HARNESS_ORIGIN));
	const requestAt = (urlPath: string): HarnessAsset | null =>
		serve(new URL(urlPath, HARNESS_ORIGIN));

	it("serves a file beside the document, as the image its extension claims", () => {
		const image = requestFor("logo.png");
		expect(image?.contentType).toBe("image/png");
		expect(image?.body.equals(PNG_BYTES)).toBe(true);
	});

	it("serves a file in a subdirectory of the document's own", () => {
		expect(requestFor("images/nested.png")?.contentType).toBe("image/png");
	});

	it("reads the extension case-insensitively", () => {
		expect(requestFor("photo.JPG")?.contentType).toBe("image/jpeg");
	});

	it("names an SVG as one, so the browser draws it rather than downloads it", () => {
		expect(requestFor("mark.svg")?.contentType).toBe("image/svg+xml");
	});

	it("carries a src the URL would otherwise cut up", () => {
		expect(requestFor("my logo.png")?.body.equals(PNG_BYTES)).toBe(true);
		expect(requestFor("a#b?c.png")).toBeNull();
		expect(reportedReasons.at(-1)).toContain('cannot read "a#b?c.png"');
	});

	it("has nothing for a URL that is not an image request", () => {
		expect(requestAt("/index.html")).toBeNull();
		expect(requestAt("/fonts/source-sans-3-latin-400-normal.woff2")).toBeNull();
		expect(requestAt("/doc-image")).toBeNull();
	});

	it("refuses to walk out of the document's directory, and says why", () => {
		reportedReasons.length = 0;
		expect(requestFor("../outside.png")).toBeNull();
		expect(requestFor("images/../../outside.png")).toBeNull();
		expect(requestFor("/outside.png")).toBeNull();
		expect(reportedReasons).toHaveLength(3);
		for (const reason of reportedReasons) {
			expect(reason).toContain("not a relative path inside");
		}
	});

	it("refuses a parent step that arrived percent-encoded, and says so once", () => {
		// The escape is what a hand-written URL, or a browser too polite to fold
		// the path, delivers; the query is read decoded either way.
		reportedReasons.length = 0;
		expect(requestAt("/doc-image?src=%2e%2e%2Fx.png")).toBeNull();
		expect(requestAt("/doc-image?src=%2e%2e%2Fx.png")).toBeNull();
		expect(reportedReasons).toEqual([
			expect.stringContaining("not a relative path inside"),
		]);
	});

	it("has nothing for a file that is not there, and says so once", () => {
		reportedReasons.length = 0;
		expect(requestFor("missing.png")).toBeNull();
		expect(requestFor("missing.png")).toBeNull();
		expect(reportedReasons).toEqual([
			expect.stringContaining('cannot read "missing.png"'),
		]);
	});

	it("has nothing for a file type the canvas cannot draw, and says so", () => {
		reportedReasons.length = 0;
		expect(requestFor("notes.txt")).toBeNull();
		expect(requestFor("logo")).toBeNull();
		expect(reportedReasons).toEqual([
			expect.stringContaining("not an image file type"),
			expect.stringContaining("not an image file type"),
		]);
	});

	it("does not report a request that was never for an image", () => {
		reportedReasons.length = 0;
		requestAt("/assets/harness.js");
		expect(reportedReasons).toEqual([]);
	});
});

import {
	insertPngTextChunk,
	PNG_SOURCE_KEYWORD,
	readPngTextChunk,
} from "@jiscribe/doc/png-source";
import { describe, expect, it, vi } from "vitest";

import { EMPTY_CANVAS_DOC_JSON } from "../../canvasDocSource";
import {
	computeExportBytes,
	embedCurrentSource,
	readSourceFromImageFile,
	reconcileImageDocument,
	revertImageDocument,
	saveImageDocument,
	type ImageDocSeams,
	type ImageDocState,
	type JiscribeImageKind,
} from "../imageDocumentOps";

// --- fixtures ---------------------------------------------------------------

/** 1x1 transparent PNG (real encoder output), the base for PNG fallback bytes. */
const TINY_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const tinyPng = (): Uint8Array =>
	new Uint8Array(Buffer.from(TINY_PNG_BASE64, "base64"));

/** A PNG with `source` embedded, standing in for a saved-on-disk image. */
const pngWithSource = (source: string): Uint8Array =>
	insertPngTextChunk(tinyPng(), PNG_SOURCE_KEYWORD, source);

/**
 * SVG mimicking embedCanvasSource output. `geometry` is a marker for the drawn
 * shape so a test can tell a re-rendered image from a fallback (source-only) one.
 */
const svgWithSource = (source: string, geometry = "0 0 100 100"): string =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
	`<metadata><jiscribe:source xmlns:jiscribe="https://jiscribe.dev/ns/canvas" ` +
	`data-jiscribe-version="1">${source}</jiscribe:source></metadata>` +
	`<rect x="0" y="0" width="100" height="100" data-geometry="${geometry}"/></svg>`;

/** An SVG with no embedded jiscribe source (an image not exported from jiscribe). */
const svgNoSource = (): string =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
	`<rect x="0" y="0" width="100" height="100"/></svg>`;

const svgBytes = (svg: string): Uint8Array =>
	new Uint8Array(Buffer.from(svg, "utf8"));

const decodeUtf8 = (bytes: Uint8Array): string =>
	Buffer.from(bytes).toString("utf8");

/** Encode an SVG render result the way the webview sends it (base64, #182). */
const svgRenderResult = (svg: string): string =>
	Buffer.from(svg, "utf8").toString("base64");

// --- test doubles -----------------------------------------------------------

const makeDoc = (
	kind: JiscribeImageKind,
	savedBytes: Uint8Array,
	sourceText: string | null,
): ImageDocState => ({
	kind,
	savedBytes,
	sourceText,
	needsImageReconcile: false,
	reconcileInFlight: false,
});

/** Fake seams capturing writes; render defaults to "webview unavailable" (null). */
const makeSeams = (
	over: Partial<ImageDocSeams> = {},
): { seams: ImageDocSeams; writes: Uint8Array[] } => {
	const writes: Uint8Array[] = [];
	const seams: ImageDocSeams = {
		render: over.render ?? vi.fn(async () => null),
		readFile: over.readFile ?? vi.fn(async () => new Uint8Array()),
		writeFile:
			over.writeFile ??
			vi.fn(async (bytes: Uint8Array) => {
				writes.push(bytes);
			}),
		isCancelled: over.isCancelled,
	};
	return { seams, writes };
};

/** A promise plus its resolver, for driving async ordering in tests. */
const deferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
};

// --- saveImageDocument ------------------------------------------------------

describe("saveImageDocument", () => {
	it("uses the live render and clears a pending reconcile flag when the webview responds", async () => {
		const doc = makeDoc("svg", svgBytes(svgWithSource("STALE")), "STALE");
		// A prior hidden-tab save left this set; a fresh render must clear it.
		doc.needsImageReconcile = true;
		const rendered = svgWithSource("FRESH", "re-rendered");
		const { seams, writes } = makeSeams({
			render: async () => svgRenderResult(rendered),
		});

		await saveImageDocument(doc, seams);

		expect(decodeUtf8(writes[0])).toBe(rendered);
		expect(doc.needsImageReconcile).toBe(false);
		// #178: sourceText re-syncs to whatever the written image actually embeds.
		expect(doc.sourceText).toBe("FRESH");
	});

	it("falls back to old-image + new-source and flags reconcile when the webview is unavailable (#179)", async () => {
		const doc = makeDoc(
			"svg",
			svgBytes(svgWithSource("OLD", "original")),
			"NEW",
		);
		const { seams, writes } = makeSeams({ render: async () => null });

		await saveImageDocument(doc, seams);

		const written = decodeUtf8(writes[0]);
		// New source landed, but the drawn geometry is still the old (stale) image.
		expect(written).toContain(">NEW</jiscribe:source>");
		expect(written).toContain('data-geometry="original"');
		expect(doc.needsImageReconcile).toBe(true);
	});

	it("does not flag reconcile on fallback when there is no embedded source", async () => {
		const doc = makeDoc("svg", svgBytes(svgNoSource()), null);
		const { seams } = makeSeams({ render: async () => null });

		await saveImageDocument(doc, seams);

		expect(doc.needsImageReconcile).toBe(false);
	});

	it("does not write when the save was cancelled", async () => {
		const doc = makeDoc("svg", svgBytes(svgWithSource("OLD")), "NEW");
		const { seams, writes } = makeSeams({
			render: async () => svgRenderResult(svgWithSource("FRESH")),
			isCancelled: () => true,
		});

		await saveImageDocument(doc, seams);

		expect(writes).toHaveLength(0);
		expect(doc.sourceText).toBe("NEW"); // unchanged
	});

	it("decodes a PNG render result from base64", async () => {
		const doc = makeDoc("png", pngWithSource("OLD"), "NEW");
		const renderedPng = pngWithSource("FRESH");
		const { seams, writes } = makeSeams({
			render: async () => Buffer.from(renderedPng).toString("base64"),
		});

		await saveImageDocument(doc, seams);

		expect(writes[0]).toEqual(renderedPng);
		expect(doc.sourceText).toBe("FRESH");
		expect(doc.needsImageReconcile).toBe(false);
	});
});

// --- computeExportBytes (Save As format handling) ---------------------------

describe("computeExportBytes", () => {
	it("throws when a cross-format Save As has to fall back (can't re-render the other format)", async () => {
		const doc = makeDoc("png", pngWithSource("SRC"), "SRC");
		const { seams } = makeSeams({ render: async () => null });

		await expect(computeExportBytes(doc, seams, "svg")).rejects.toThrow(
			/Cannot save as \.jis\.svg/,
		);
	});
});

// --- reconcileImageDocument (#179) ------------------------------------------

describe("reconcileImageDocument", () => {
	it("re-renders and rewrites the stale image, then clears the flag", async () => {
		const doc = makeDoc("svg", svgBytes(svgWithSource("NEW", "stale")), "NEW");
		doc.needsImageReconcile = true;
		const rendered = svgWithSource("NEW", "re-rendered");
		const { seams, writes } = makeSeams({
			render: async () => svgRenderResult(rendered),
		});

		await reconcileImageDocument(doc, seams);

		expect(decodeUtf8(writes[0])).toBe(rendered);
		expect(doc.needsImageReconcile).toBe(false);
	});

	it("is a no-op when no reconcile is pending", async () => {
		const doc = makeDoc("svg", svgBytes(svgWithSource("NEW")), "NEW");
		const render = vi.fn(async () => svgRenderResult(svgWithSource("NEW")));
		const { seams, writes } = makeSeams({ render });

		await reconcileImageDocument(doc, seams);

		expect(render).not.toHaveBeenCalled();
		expect(writes).toHaveLength(0);
	});

	it("keeps the flag set and writes nothing when the webview is still unavailable", async () => {
		const doc = makeDoc("svg", svgBytes(svgWithSource("NEW")), "NEW");
		doc.needsImageReconcile = true;
		const { seams, writes } = makeSeams({ render: async () => null });

		await reconcileImageDocument(doc, seams);

		expect(writes).toHaveLength(0);
		expect(doc.needsImageReconcile).toBe(true);
	});

	it("does not write unsaved edits when the source changes mid-render", async () => {
		const doc = makeDoc("svg", svgBytes(svgWithSource("NEW")), "NEW");
		doc.needsImageReconcile = true;
		// Simulate an edit landing while the render is in flight.
		const { seams, writes } = makeSeams({
			render: async () => {
				doc.sourceText = "EDITED";
				return svgRenderResult(svgWithSource("EDITED"));
			},
		});

		await reconcileImageDocument(doc, seams);

		expect(writes).toHaveLength(0);
		// Ownership passes to the normal save flow, so the flag is cleared.
		expect(doc.needsImageReconcile).toBe(false);
	});

	it("guards against overlapping reconcile writes (reconcileInFlight)", async () => {
		const doc = makeDoc("svg", svgBytes(svgWithSource("NEW")), "NEW");
		doc.needsImageReconcile = true;
		const gate = deferred<string>();
		const render = vi.fn(() => gate.promise);
		const { seams, writes } = makeSeams({ render });

		const first = reconcileImageDocument(doc, seams);
		// Second call arrives while the first is awaiting render.
		const second = reconcileImageDocument(doc, seams);
		await second;
		expect(render).toHaveBeenCalledTimes(1); // second bailed on the in-flight guard

		gate.resolve(svgRenderResult(svgWithSource("NEW", "re-rendered")));
		await first;
		expect(writes).toHaveLength(1);
		expect(doc.reconcileInFlight).toBe(false);
	});
});

// --- revertImageDocument ----------------------------------------------------

describe("revertImageDocument", () => {
	it("restores state from disk and drops any pending reconcile", async () => {
		const doc = makeDoc("svg", svgBytes(svgWithSource("DIRTY")), "DIRTY");
		doc.needsImageReconcile = true;
		const onDisk = svgWithSource("ONDISK");
		const { seams } = makeSeams({ readFile: async () => svgBytes(onDisk) });

		await revertImageDocument(doc, seams);

		expect(doc.sourceText).toBe("ONDISK");
		expect(decodeUtf8(doc.savedBytes)).toBe(onDisk);
		expect(doc.needsImageReconcile).toBe(false);
	});
});

// --- embedCurrentSource -----------------------------------------------------

describe("embedCurrentSource", () => {
	it("returns the saved bytes unchanged when there is no source", () => {
		const saved = svgBytes(svgWithSource("x"));
		const doc = makeDoc("svg", saved, null);
		expect(embedCurrentSource(doc)).toBe(saved);
	});

	it("throws on a cross-format request (would corrupt the file)", () => {
		const doc = makeDoc("png", pngWithSource("SRC"), "SRC");
		expect(() => embedCurrentSource(doc, "svg")).toThrow(/Cannot save as/);
	});

	it("embeds into a blank placeholder when the file holds no image yet", () => {
		// A file created empty in the Explorer has nothing to embed into; without a
		// placeholder the save would write 0 bytes and drop the edits.
		const svgDoc = makeDoc("svg", new Uint8Array(), "DRAWN");
		expect(decodeUtf8(embedCurrentSource(svgDoc))).toContain(
			">DRAWN</jiscribe:source>",
		);

		const pngDoc = makeDoc("png", new Uint8Array(), "DRAWN");
		expect(
			readPngTextChunk(embedCurrentSource(pngDoc), PNG_SOURCE_KEYWORD),
		).toBe("DRAWN");
	});
});

// --- readSourceFromImageFile ------------------------------------------------

describe("readSourceFromImageFile", () => {
	it("treats a file with no bytes as a new empty document", () => {
		// A file created empty in the Explorer must open as a blank canvas, not as
		// the uneditable "no embedded source" display.
		expect(readSourceFromImageFile("png", new Uint8Array())).toBe(
			EMPTY_CANVAS_DOC_JSON,
		);
		expect(readSourceFromImageFile("svg", new Uint8Array())).toBe(
			EMPTY_CANVAS_DOC_JSON,
		);
	});

	it("reads the embedded source of a real image", () => {
		expect(readSourceFromImageFile("png", pngWithSource("SRC"))).toBe("SRC");
		expect(readSourceFromImageFile("svg", svgBytes(svgWithSource("SRC")))).toBe(
			"SRC",
		);
	});

	it("returns null for an image carrying no source", () => {
		expect(readSourceFromImageFile("png", tinyPng())).toBeNull();
		expect(readSourceFromImageFile("svg", svgBytes(svgNoSource()))).toBeNull();
	});
});

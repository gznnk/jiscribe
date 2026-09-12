import {
	insertPngTextChunk,
	PNG_SOURCE_KEYWORD,
} from "@jiscribe/doc/png-source";
import { replaceCanvasSourceInSvgText } from "@jiscribe/doc/svg-source";

/**
 * The canvas documents and canvas images the e2e suites open.
 *
 * Everything here is built in memory and written to a temp directory by the
 * suite that needs it, so the broken documents never exist in the repository.
 */

/**
 * 1x1 transparent PNG (real encoder output), the carrier every `.jis.png`
 * fixture embeds its source into. Deliberately its own copy rather than the
 * placeholder `imageDocumentOps` falls back on: a test must not take its input
 * from the module it is opening.
 */
const TINY_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * Minimal SVG carrying the empty `jiscribe:source` element that
 * `replaceCanvasSourceInSvgText` rewrites; it only ever replaces, never inserts.
 */
const CANVAS_SVG_TEMPLATE =
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">` +
	`<metadata><jiscribe:source xmlns:jiscribe="https://jiscribe.dev/ns/canvas" ` +
	`data-jiscribe-version="1"></jiscribe:source></metadata></svg>`;

/** Minimal SVG with no source element, standing in for any image not exported by jiscribe. */
const PLAIN_SVG_TEXT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>`;

/**
 * One rect object, the simplest shape the built-in parser accepts.
 *
 * @param id - the object's id; repeating one inside a single document is what
 *   makes {@link duplicateIdCanvasDocJson} fail semantic validation
 */
function rectObject(id: string): Record<string, unknown> {
	return { id, type: "rect", x: 0, y: 0, width: 10, height: 10 };
}

/**
 * A canvas document that parses and validates cleanly.
 *
 * @param objectIds - one rect per id, in z-order; an empty array yields an empty
 *   canvas, and distinct id lists give documents that differ in text
 * @returns pretty-printed JSON with "\n" separators, the shape the editor writes
 */
export function canvasDocJson(objectIds: readonly string[] = ["r1"]): string {
	return JSON.stringify(
		{ version: 1, root: objectIds.map(rectObject) },
		null,
		2,
	);
}

/**
 * The same document with no pretty-printing, for the tests that have to tell
 * "left exactly as written" apart from "rewritten by the editor".
 *
 * The editor re-indents whatever it hands the webview, so a document already in
 * its output shape would come back byte-identical from a write-back loop; this
 * one would not.
 *
 * @param objectIds - one rect per id, as in {@link canvasDocJson}
 */
export function compactCanvasDocJson(objectIds: readonly string[]): string {
	return JSON.stringify({ version: 1, root: objectIds.map(rectObject) });
}

/**
 * A canvas document whose only fault is semantic: two objects share an id.
 *
 * JSON syntax and schema-expressible structure are both intact, so this is the
 * class of error DiagnosticProvider owns and the JSON schema cannot express.
 */
export function duplicateIdCanvasDocJson(): string {
	return canvasDocJson(["dup", "dup"]);
}

/** Text that is not JSON at all, for the syntax-error path. */
export const BROKEN_CANVAS_DOC_TEXT = "{ not valid json";

/** A PNG with no embedded canvas source, as any ordinary image would be. */
export function plainPngBytes(): Uint8Array {
	return new Uint8Array(Buffer.from(TINY_PNG_BASE64, "base64"));
}

/**
 * `.jis.png` bytes: the tiny PNG with a canvas source in its iTXt chunk.
 *
 * @param sourceJson - the document text to embed, stored verbatim under the
 *   keyword the extension reads back ({@link PNG_SOURCE_KEYWORD})
 */
export function jisPngBytes(sourceJson: string): Uint8Array {
	return insertPngTextChunk(plainPngBytes(), PNG_SOURCE_KEYWORD, sourceJson);
}

/** An SVG with no embedded canvas source, as any ordinary image would be. */
export function plainSvgText(): string {
	return PLAIN_SVG_TEXT;
}

/**
 * `.jis.svg` text: the minimal SVG with a canvas source in its `<metadata>`.
 *
 * @param sourceJson - the document text to embed; XML-escaped on the way in, so
 *   it is stored as written and comes back unchanged
 */
export function jisSvgText(sourceJson: string): string {
	const svgText = replaceCanvasSourceInSvgText(CANVAS_SVG_TEMPLATE, sourceJson);
	if (svgText === null) {
		throw new Error(
			"CANVAS_SVG_TEMPLATE no longer carries a jiscribe:source element to replace",
		);
	}
	return svgText;
}

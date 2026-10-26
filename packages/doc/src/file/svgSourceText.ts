/** Namespace for jiscribe-specific data embedded in SVG for round-tripping. */
export const SVG_SOURCE_NS = "https://jiscribe.dev/ns/canvas";

/** Local name of the embedded source element (serialized as `jiscribe:source`). */
export const SVG_SOURCE_LOCAL_NAME = "source";

// Serialized tag of the element embedCanvasSource (canvasSourceMetadata.ts) produces.
// SVG using a different prefix, hand-written or otherwise, is out of scope — only
// jiscribe's own exports are handled.
const SOURCE_TAG = `jiscribe:${SVG_SOURCE_LOCAL_NAME}`;

const OPEN_TAG_START = `<${SOURCE_TAG}`;
const CLOSE_TAG = `</${SOURCE_TAG}>`;

/** Where the embedded element's content sits in the SVG text. */
type SourceElementSpan = {
	contentStart: number;
	contentEnd: number;
};

// A regex with a lazy body (`[\s\S]*?`) rescans to the end of the text for every
// open tag that has no close tag after it, which is quadratic on a crafted file
// and stalls the caller for minutes; indexOf keeps the scan linear.
const findSourceElement = (svgText: string): SourceElementSpan | null => {
	let searchFrom = 0;
	for (;;) {
		const openTagStart = svgText.indexOf(OPEN_TAG_START, searchFrom);
		if (openTagStart === -1) {
			return null;
		}
		const nameEnd = openTagStart + OPEN_TAG_START.length;
		// The tag name must end here, so `<jiscribe:sourcex>` is another element
		if (/\w/.test(svgText.charAt(nameEnd))) {
			searchFrom = nameEnd;
			continue;
		}
		const openTagEnd = svgText.indexOf(">", nameEnd);
		if (openTagEnd === -1) {
			return null;
		}
		const closeTagStart = svgText.indexOf(CLOSE_TAG, openTagEnd + 1);
		if (closeTagStart === -1) {
			return null;
		}
		return { contentStart: openTagEnd + 1, contentEnd: closeTagStart };
	}
};

const MAX_CODE_POINT = 0x10ffff;

const escapeXmlText = (text: string): string =>
	text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const unescapeXmlText = (text: string): string =>
	text.replace(
		/&(#x[0-9a-fA-F]+|#\d+|lt|gt|quot|apos|amp);/g,
		(_, entity: string) => {
			switch (entity) {
				case "lt":
					return "<";
				case "gt":
					return ">";
				case "quot":
					return '"';
				case "apos":
					return "'";
				case "amp":
					return "&";
			}
			const codePoint = entity.startsWith("#x")
				? parseInt(entity.slice(2), 16)
				: parseInt(entity.slice(1), 10);
			// fromCodePoint throws past U+10FFFF; a reference no character answers to
			// is left as written
			return codePoint <= MAX_CODE_POINT
				? String.fromCodePoint(codePoint)
				: `&${entity};`;
		},
	);

/**
 * Extract the embedded source JSON from `.jis.svg` text. Needs no DOM, so it runs in Node.
 *
 * @param svgText - Whole SVG document text; only a `jiscribe:source` element is recognized, so
 *   SVG written with a different prefix yields null. XML entities in the element are unescaped;
 *   a character reference past U+10FFFF is kept as written
 * @returns The raw JSON, never validated as JSON; null when the element is absent, or present
 *   but empty once trimmed
 */
export const extractCanvasSourceFromSvgText = (
	svgText: string,
): string | null => {
	const span = findSourceElement(svgText);
	if (span === null) {
		return null;
	}
	const sourceJson = unescapeXmlText(
		svgText.slice(span.contentStart, span.contentEnd),
	).trim();
	return sourceJson === "" ? null : sourceJson;
};

/**
 * Replace the embedded source of SVG text with `sourceJson`. Needs no DOM, so it runs in Node.
 *
 * @param svgText - Whole SVG document text; the `jiscribe:source` element must already exist,
 *   since this rewrites the element's content and never inserts one
 * @param sourceJson - Written out XML-escaped (`&`, `<`, `>`) and never validated as JSON; the
 *   surrounding open and close tags are preserved verbatim
 * @returns The rewritten text, or null when there is no embedded element to replace
 */
export const replaceCanvasSourceInSvgText = (
	svgText: string,
	sourceJson: string,
): string | null => {
	const span = findSourceElement(svgText);
	if (span === null) {
		return null;
	}
	return (
		svgText.slice(0, span.contentStart) +
		escapeXmlText(sourceJson) +
		svgText.slice(span.contentEnd)
	);
};

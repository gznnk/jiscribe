/** Namespace for jiscribe-specific data embedded in SVG for round-tripping. */
export const SVG_SOURCE_NS = "https://jiscribe.dev/ns/canvas";

/** Local name of the embedded source element (serialized as `jiscribe:source`). */
export const SVG_SOURCE_LOCAL_NAME = "source";

// Serialized tag of the element embedCanvasSource (canvasSourceMetadata.ts) produces.
// SVG using a different prefix, hand-written or otherwise, is out of scope — only
// jiscribe's own exports are handled.
const SOURCE_TAG = `jiscribe:${SVG_SOURCE_LOCAL_NAME}`;

const SOURCE_ELEMENT_PATTERN = new RegExp(
	`(<${SOURCE_TAG}\\b[^>]*>)([\\s\\S]*?)(</${SOURCE_TAG}>)`,
);

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
			return String.fromCodePoint(
				entity.startsWith("#x")
					? parseInt(entity.slice(2), 16)
					: parseInt(entity.slice(1), 10),
			);
		},
	);

/**
 * Extract the embedded source JSON from `.jis.svg` text. Needs no DOM, so it runs in Node.
 *
 * @param svgText - Whole SVG document text; only a `jiscribe:source` element is recognized, so
 *   SVG written with a different prefix yields null. XML entities in the element are unescaped
 * @returns The raw JSON, never validated as JSON; null when the element is absent, or present
 *   but empty once trimmed
 */
export const extractCanvasSourceFromSvgText = (
	svgText: string,
): string | null => {
	const match = SOURCE_ELEMENT_PATTERN.exec(svgText);
	if (!match) {
		return null;
	}
	const sourceJson = unescapeXmlText(match[2]).trim();
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
	if (!SOURCE_ELEMENT_PATTERN.test(svgText)) {
		return null;
	}
	return svgText.replace(
		SOURCE_ELEMENT_PATTERN,
		(_matched, openTag: string, _content, closeTag: string) =>
			`${openTag}${escapeXmlText(sourceJson)}${closeTag}`,
	);
};

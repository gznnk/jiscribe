import DOMPurify from "dompurify";

import { isValidSvgString } from "./isValidSvgString";
import { ERROR_SVG_ICON_STRING, SVG_NAMESPACE } from "./SvgConstants";

// On top of what DOMPurify drops on its own (scripts, event handlers, <use>,
// <foreignObject>, <animate> and <set>): a <style> inlined here applies to the
// whole page rather than to this one object, and an <a> would navigate the editor.
const FORBIDDEN_TAGS = ["style", "a"];

// The CSS functions that load something: url() is checked for a fragment target,
// the image functions take a bare string and are external by definition
const LOADING_FUNCTION_PATTERN =
	/(-webkit-image-set|image-set|cross-fade|image|src|url)\(/gi;

// A CSS escape: `\` then up to six hex digits and one optional whitespace, or
// any one other character (CSS Syntax §4.3.7). Line breaks are normalized first
const CSS_ESCAPE_PATTERN = /\\(?:([0-9a-fA-F]{1,6})[ \t\n]?|(.))/gs;

// CSS Syntax §3.3 preprocessing: CRLF, CR and FF are all one LF to the tokenizer
const CSS_LINE_BREAK_PATTERN = /\r\n?|\f/g;

const isCssWhitespace = (character: string): boolean =>
	character === " " ||
	character === "\t" ||
	character === "\n" ||
	character === "\r" ||
	character === "\f";

/**
 * Resolves CSS escapes, so that `u\72l(` is seen as the `url(` the browser's
 * tokenizer makes of it. A code point outside Unicode becomes U+FFFD, as it does
 * there.
 */
const decodeCssEscapes = (value: string): string =>
	value
		.replace(CSS_LINE_BREAK_PATTERN, "\n")
		.replace(CSS_ESCAPE_PATTERN, (_, hex: string | undefined, other) => {
			if (hex === undefined) {
				return other;
			}
			const codePoint = Number.parseInt(hex, 16);
			return codePoint === 0 || codePoint > 0x10ffff
				? "�"
				: String.fromCodePoint(codePoint);
		});

/**
 * Whether the value holds a CSS function that would load another document: an
 * image function, or a `url()` whose target is not a fragment. The paint servers,
 * filters, masks and clip paths an object's markup can point at are all in the
 * markup itself, as `#id`.
 */
const hasExternalLoadingFunction = (value: string): boolean => {
	const decoded = decodeCssEscapes(value);
	for (const match of decoded.matchAll(LOADING_FUNCTION_PATTERN)) {
		if (match[1].toLowerCase() !== "url") {
			return true;
		}
		let position = match.index + match[0].length;
		while (isCssWhitespace(decoded.charAt(position))) {
			position += 1;
		}
		if (decoded.charAt(position) === '"' || decoded.charAt(position) === "'") {
			position += 1;
			while (isCssWhitespace(decoded.charAt(position))) {
				position += 1;
			}
		}
		const target = decoded.charAt(position);
		if (target !== "#" && target !== ")" && target !== "") {
			return true;
		}
	}
	return false;
};

const isHrefAttribute = (attributeName: string): boolean => {
	const lowerName = attributeName.toLowerCase();
	return lowerName === "href" || lowerName === "xlink:href";
};

/**
 * Whether an href may stay: a `#fragment` points into the markup itself, and a
 * `data:` image on <image> is how raster pixels travel inside it. Anything else
 * names another document, a request the file's author would get to send from the
 * reader's browser.
 */
const isAllowedHref = (element: Element, value: string): boolean => {
	const trimmed = value.trim();
	if (trimmed.startsWith("#")) {
		return true;
	}
	return element.localName === "image" && /^data:image\//i.test(trimmed);
};

/**
 * Removes every reference to another document: an `href` / `xlink:href` that is not
 * a `#fragment` (a `data:` image on `<image>` excepted), and any attribute whose
 * value loads one through a CSS function. DOMPurify lets an `http(s):` href through
 * and does not read `url()` in a presentation attribute or an inline `style` at
 * all, so both are checked here, on the parsed element. The whole attribute goes,
 * `style` included, rather than the one declaration.
 */
const removeExternalReferences = (root: Element): void => {
	const elements = [root, ...Array.from(root.querySelectorAll("*"))];
	for (const element of elements) {
		for (const attribute of Array.from(element.attributes)) {
			const isExternal = isHrefAttribute(attribute.name)
				? !isAllowedHref(element, attribute.value)
				: hasExternalLoadingFunction(attribute.value);
			if (isExternal) {
				element.removeAttribute(attribute.name);
			}
		}
	}
};

/**
 * Sanitizes the markup of an `svg` object and parses it, for inline injection into
 * the editor's document.
 *
 * @param svgText - Markup as the document holds it; anything DOMPurify does not
 *   allow in the SVG namespace is dropped, and so are `<style>` (its rules with it,
 *   so `class`-styled markup loses those styles), `<a>`, and every reference to
 *   another document (see {@link removeExternalReferences})
 * @returns The root `<svg>` element of an inert document, never attached to a
 *   page; the error icon when nothing parseable survived
 */
export const parseSanitizedSvg = (svgText: string): SVGElement => {
	let sanitized = DOMPurify.sanitize(svgText, {
		NAMESPACE: SVG_NAMESPACE,
		FORBID_TAGS: FORBIDDEN_TAGS,
	});
	if (!isValidSvgString(sanitized)) {
		sanitized = ERROR_SVG_ICON_STRING;
	}
	const element = new DOMParser().parseFromString(sanitized, "image/svg+xml")
		.documentElement as unknown as SVGElement;
	removeExternalReferences(element);
	return element;
};

import DOMPurify from "dompurify";

import { SVG_NAMESPACE } from "./SvgConstants";

// On top of what DOMPurify drops on its own (scripts, event handlers, <use>,
// <foreignObject>, the animation elements): a <style> inlined here applies to the
// whole page rather than to this one object, and an <a> would navigate the editor.
const FORBIDDEN_TAGS = ["style", "a"];

const URL_FUNCTION_PATTERN = /url\(/gi;

const isCssWhitespace = (character: string): boolean =>
	character === " " ||
	character === "\t" ||
	character === "\n" ||
	character === "\r" ||
	character === "\f";

/**
 * Whether the value holds a `url()` whose target is not a fragment. A CSS escape
 * such as `url(\23 id)` is taken as external too, and lost; the paint servers,
 * filters, masks and clip paths an object's markup can point at are all in the
 * markup itself, as `#id`.
 */
const hasExternalUrlFunction = (value: string): boolean => {
	for (const match of value.matchAll(URL_FUNCTION_PATTERN)) {
		let position = match.index + match[0].length;
		while (isCssWhitespace(value.charAt(position))) {
			position += 1;
		}
		if (value.charAt(position) === '"' || value.charAt(position) === "'") {
			position += 1;
			while (isCssWhitespace(value.charAt(position))) {
				position += 1;
			}
		}
		const target = value.charAt(position);
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
 * Sanitizes the markup of an `svg` object for inline injection into the editor's
 * document. The references it leaves in are checked by
 * {@link removeExternalReferences} once the markup is parsed.
 *
 * @param svgText - Markup as the document holds it; anything DOMPurify does not
 *   allow in the SVG namespace is dropped, and so are `<style>` and `<a>`
 * @returns The sanitized markup, possibly empty when nothing survived
 */
export const sanitizeSvgText = (svgText: string): string =>
	DOMPurify.sanitize(svgText, {
		NAMESPACE: SVG_NAMESPACE,
		FORBID_TAGS: FORBIDDEN_TAGS,
	});

/**
 * Removes every reference to another document: an `href` / `xlink:href` that is not
 * a `#fragment` (a `data:` image on `<image>` excepted), and any attribute whose
 * value names one through `url()`. DOMPurify lets an `http(s):` href through and
 * does not read `url()` in a presentation attribute or an inline `style` at all,
 * so both are checked here, on the parsed element.
 *
 * @param root - The sanitized element; it and every descendant are rewritten in place
 */
export const removeExternalReferences = (root: Element): void => {
	const elements = [root, ...Array.from(root.querySelectorAll("*"))];
	for (const element of elements) {
		for (const attribute of Array.from(element.attributes)) {
			const isExternal = isHrefAttribute(attribute.name)
				? !isAllowedHref(element, attribute.value)
				: hasExternalUrlFunction(attribute.value);
			if (isExternal) {
				element.removeAttribute(attribute.name);
			}
		}
	}
};

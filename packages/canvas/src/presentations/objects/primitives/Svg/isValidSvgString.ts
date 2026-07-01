import { isString } from "@workspace/basic-validators";

/**
 * Determines whether a string is valid SVG (parseable and rooted at <svg>).
 * Used on the sanitized string; if invalid, the caller swaps in an error icon.
 */
export const isValidSvgString = (svgString: string): boolean => {
	if (!isString(svgString) || svgString.length === 0) {
		return false;
	}

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(svgString, "image/svg+xml");

		if (doc.querySelector("parsererror")) {
			return false;
		}

		return doc.documentElement.tagName.toLowerCase() === "svg";
	} catch {
		return false;
	}
};

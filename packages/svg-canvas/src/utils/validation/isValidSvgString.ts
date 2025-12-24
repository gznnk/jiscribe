import { isString } from "@workspace/basic-validators";

/**
 * SVG validation utility
 * Validates SVG strings by attempting to parse them as XML
 */

/**
 * Validates if a string is a valid SVG
 * @param svgString - The SVG string to validate
 * @returns true if the SVG is valid, false otherwise
 */
export const isValidSvgString = (svgString: string): boolean => {
	if (!isString(svgString) || svgString.length === 0) {
		return false;
	}

	try {
		// Create a DOM parser to parse the SVG string
		const parser = new DOMParser();
		const doc = parser.parseFromString(svgString, "image/svg+xml");

		// Check for parsing errors
		const parserError = doc.querySelector("parsererror");
		if (parserError) {
			return false;
		}

		// Check if the root element is an SVG element
		const svgElement = doc.documentElement;
		if (svgElement.tagName.toLowerCase() !== "svg") {
			return false;
		}

		return true;
	} catch {
		return false;
	}
};

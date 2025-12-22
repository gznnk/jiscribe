import DOMPurify from "dompurify";

import { createSvgState } from "../../shapes/svg/createSvgState";
import { isValidSvgString } from "../../validation/isValidSvgString";

/**
 * Creates svg state from an SVG text string.
 *
 * @param data - The SVG text
 * @returns The created SvgState or undefined if parsing fails
 */
export const createSvgStateFromText = (data: string) => {
	const sanitized = DOMPurify.sanitize(data, {
		NAMESPACE: "http://www.w3.org/2000/svg",
	});

	if (!isValidSvgString(sanitized)) {
		console.error("Invalid svg string.");
		return undefined;
	}

	return createSvgState({
		x: 0,
		y: 0,
		svgText: data,
		width: 100,
		height: 100,
		keepProportion: true,
	});
};

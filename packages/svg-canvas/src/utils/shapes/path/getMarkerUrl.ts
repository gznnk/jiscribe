import type { ArrowHeadType } from "../../../types/core/ArrowHeadType";

/**
 * Helper function to get marker URL for SVG attributes.
 * @param type - The arrow head type
 * @returns The marker URL string or undefined if type is None or undefined
 */
export const getMarkerUrl = (
	type: ArrowHeadType | undefined,
): string | undefined => {
	if (!type || type === "None") {
		return undefined;
	}

	if (type === "FilledTriangle") {
		return "url(#marker-filled-triangle)";
	}
	if (type === "ConcaveTriangle") {
		return "url(#marker-concave-triangle)";
	}
	if (type === "OpenArrow") {
		return "url(#marker-open-arrow)";
	}
	if (type === "HollowTriangle") {
		return "url(#marker-hollow-triangle)";
	}
	if (type === "FilledDiamond") {
		return "url(#marker-filled-diamond)";
	}
	if (type === "HollowDiamond") {
		return "url(#marker-hollow-diamond)";
	}
	if (type === "Circle") {
		return "url(#marker-circle)";
	}

	return undefined;
};

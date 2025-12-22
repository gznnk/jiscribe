import type { SvgData } from "../../../types/data/shapes/SvgData";

/**
 * Type guard to check if a diagram is svg data.
 *
 * @param data - The data to check
 * @returns True if the data is SvgData
 */
export const isSvgData = (data: unknown): data is SvgData => {
	return (
		typeof data === "object" &&
		data !== null &&
		"type" in data &&
		(data as { type: string }).type === "Svg" &&
		"svgText" in data &&
		"width" in data &&
		"height" in data &&
		"initialWidth" in data &&
		"initialHeight" in data
	);
};

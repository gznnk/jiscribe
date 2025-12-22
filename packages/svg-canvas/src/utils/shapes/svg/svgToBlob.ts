import { isSvgData } from "./isSvgData";
import type { Diagram } from "../../../types/state/core/Diagram";

/**
 * Converts svg data to a Blob.
 *
 * @param data - The diagram containing svg data
 * @returns A Blob representing the svg or undefined if not valid
 */
export const svgToBlob = (data: Diagram): Blob | undefined => {
	if (isSvgData(data)) {
		return new Blob([data.svgText], {
			type: "image/svg+xml",
		});
	}
	return undefined;
};

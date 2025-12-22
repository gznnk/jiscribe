import type { ConnectPointData } from "../../../types/data/shapes/ConnectPointData";
import { DiagramBaseDefaultData } from "../core/DiagramBaseDefaultData";

/**
 * Default connect point data template.
 * Used for State to Data conversion mapping.
 */
export const ConnectPointDefaultData = {
	...DiagramBaseDefaultData,
	type: "ConnectPoint",
	name: "",
} as const satisfies ConnectPointData;

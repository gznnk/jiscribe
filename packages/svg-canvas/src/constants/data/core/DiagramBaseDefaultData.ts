import type { DiagramBaseData } from "../../../types/data/core/DiagramBaseData";

/**
 * Default diagram base data template.
 * Used for State to Data conversion mapping.
 */
export const DiagramBaseDefaultData = {
	id: "",
	type: "Rectangle",
	x: 0,
	y: 0,
	name: "",
	description: "",
} as const satisfies DiagramBaseData;

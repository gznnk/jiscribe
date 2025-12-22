import type { ConnectableData } from "../../../types/data/shapes/ConnectableData";

/**
 * Default connectable data template.
 * Used for State to Data conversion mapping.
 */
export const ConnectableDefaultData = {
	connectEnabled: true,
	connectPoints: [],
} as const satisfies ConnectableData;

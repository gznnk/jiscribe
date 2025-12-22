import type { FrameableData } from "../../../types/data/core/FrameableData";

/**
 * Default frameable data template.
 * Used for State to Data conversion mapping.
 */
export const FrameableDefaultData = {
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
} as const satisfies FrameableData;

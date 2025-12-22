import { isFrame } from "./isFrame";
import type { FrameableData } from "../../types/data/core/FrameableData";

/**
 * Check if data has valid frame properties (frameable feature).
 */
export const isFrameableData = (data: unknown): data is FrameableData => {
	return isFrame(data);
};

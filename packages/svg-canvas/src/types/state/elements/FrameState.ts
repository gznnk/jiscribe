import type { FrameData, FrameFeatures } from "../../data/elements/FrameData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for Frame elements.
 * Contains properties specific to Frame diagram elements.
 */
export type FrameState = CreateStateType<FrameData, typeof FrameFeatures>;

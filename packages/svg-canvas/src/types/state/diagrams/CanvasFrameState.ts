import type {
	CanvasFrameData,
	CanvasFrameFeatures,
} from "../../data/diagrams/CanvasFrameData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for CanvasFrame diagrams.
 * Contains properties specific to CanvasFrame diagram elements.
 */
export type CanvasFrameState = CreateStateType<CanvasFrameData, typeof CanvasFrameFeatures>;
import { CanvasFrameDefaultState } from "../../../constants/state/diagrams/CanvasFrameDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { CanvasFrameState } from "../../../types/state/diagrams/CanvasFrameState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

/**
 * Maps CanvasFrame data to state
 */
export const mapCanvasFrameDataToState = createDataToStateMapper<CanvasFrameState>(
	CanvasFrameDefaultState,
);

export const canvasFrameDataToState = (data: DiagramData): Diagram =>
	mapCanvasFrameDataToState(data);
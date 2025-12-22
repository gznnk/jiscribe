import { CanvasFrameDefaultData } from "../../../constants/data/diagrams/CanvasFrameDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { CanvasFrameData } from "../../../types/data/diagrams/CanvasFrameData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { CanvasFrameState } from "../../../types/state/diagrams/CanvasFrameState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

/**
 * Maps CanvasFrame state to data
 */
export const mapCanvasFrameStateToData =
	createStateToDataMapper<CanvasFrameData>(CanvasFrameDefaultData);

export const canvasFrameStateToData = (state: Diagram): DiagramData =>
	mapCanvasFrameStateToData(state as CanvasFrameState);
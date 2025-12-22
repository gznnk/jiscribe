import { NodeHeaderDefaultState } from "../../../constants/state/elements/NodeHeaderDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { NodeHeaderState } from "../../../types/state/elements/NodeHeaderState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapNodeHeaderDataToState =
	createDataToStateMapper<NodeHeaderState>(NodeHeaderDefaultState);

export const nodeHeaderDataToState = (data: DiagramData): Diagram =>
	mapNodeHeaderDataToState(data);

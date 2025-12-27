import { TextAreaNodeDefaultState } from "../../../constants/state/nodes/TextAreaNodeDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { TextAreaNodeState } from "../../../types/state/nodes/TextAreaNodeState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapTextAreaNodeDataToState =
	createDataToStateMapper<TextAreaNodeState>(TextAreaNodeDefaultState);

export const textAreaNodeDataToState = (data: DiagramData): Diagram =>
	mapTextAreaNodeDataToState(data as unknown as TextAreaNodeState);

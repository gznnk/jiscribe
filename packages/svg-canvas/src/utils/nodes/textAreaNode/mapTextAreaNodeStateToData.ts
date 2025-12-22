import { TextAreaNodeDefaultData } from "../../../constants/data/nodes/TextAreaNodeDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { TextAreaNodeData } from "../../../types/data/nodes/TextAreaNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { TextAreaNodeState } from "../../../types/state/nodes/TextAreaNodeState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapTextAreaNodeStateToData =
	createStateToDataMapper<TextAreaNodeData>(TextAreaNodeDefaultData);

export const textAreaNodeStateToData = (state: Diagram): DiagramData =>
	mapTextAreaNodeStateToData(state as TextAreaNodeState);

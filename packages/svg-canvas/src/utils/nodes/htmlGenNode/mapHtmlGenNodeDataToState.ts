import { HtmlGenNodeDefaultState } from "../../../constants/state/nodes/HtmlGenNodeDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { HtmlGenNodeData } from "../../../types/data/nodes/HtmlGenNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { HtmlGenNodeState } from "../../../types/state/nodes/HtmlGenNodeState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapHtmlGenNodeDataToState =
	createDataToStateMapper<HtmlGenNodeState>(HtmlGenNodeDefaultState);

export const htmlGenNodeDataToState = (data: DiagramData): Diagram =>
	mapHtmlGenNodeDataToState(data as HtmlGenNodeData);
import { HtmlGenNodeDefaultData } from "../../../constants/data/nodes/HtmlGenNodeDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { HtmlGenNodeData } from "../../../types/data/nodes/HtmlGenNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { HtmlGenNodeState } from "../../../types/state/nodes/HtmlGenNodeState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapHtmlGenNodeStateToData =
	createStateToDataMapper<HtmlGenNodeData>(HtmlGenNodeDefaultData);

export const htmlGenNodeStateToData = (state: Diagram): DiagramData =>
	mapHtmlGenNodeStateToData(state as HtmlGenNodeState);
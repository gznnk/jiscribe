import { HubNodeDefaultData } from "../../../constants/data/nodes/HubNodeDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { HubNodeData } from "../../../types/data/nodes/HubNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { HubNodeState } from "../../../types/state/nodes/HubNodeState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapHubNodeStateToData =
	createStateToDataMapper<HubNodeData>(HubNodeDefaultData);

export const hubNodeStateToData = (state: Diagram): DiagramData =>
	mapHubNodeStateToData(state as HubNodeState);

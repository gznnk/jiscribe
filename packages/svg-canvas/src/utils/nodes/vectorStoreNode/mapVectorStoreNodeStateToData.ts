import { VectorStoreNodeDefaultData } from "../../../constants/data/nodes/VectorStoreNodeDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { VectorStoreNodeData } from "../../../types/data/nodes/VectorStoreNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { VectorStoreNodeState } from "../../../types/state/nodes/VectorStoreNodeState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapVectorStoreNodeStateToData =
	createStateToDataMapper<VectorStoreNodeData>(VectorStoreNodeDefaultData);

export const vectorStoreNodeStateToData = (state: Diagram): DiagramData =>
	mapVectorStoreNodeStateToData(state as VectorStoreNodeState);

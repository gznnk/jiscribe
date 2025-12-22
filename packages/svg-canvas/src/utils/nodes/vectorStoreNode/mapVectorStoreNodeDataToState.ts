import { VectorStoreNodeDefaultState } from "../../../constants/state/nodes/VectorStoreNodeDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { VectorStoreNodeData } from "../../../types/data/nodes/VectorStoreNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { VectorStoreNodeState } from "../../../types/state/nodes/VectorStoreNodeState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapVectorStoreNodeDataToState =
	createDataToStateMapper<VectorStoreNodeState>(VectorStoreNodeDefaultState);

export const vectorStoreNodeDataToState = (data: DiagramData): Diagram =>
	mapVectorStoreNodeDataToState(data as VectorStoreNodeData);

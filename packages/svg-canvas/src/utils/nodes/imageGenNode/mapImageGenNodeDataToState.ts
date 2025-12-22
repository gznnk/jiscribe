import { ImageGenNodeDefaultState } from "../../../constants/state/nodes/ImageGenNodeDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { ImageGenNodeData } from "../../../types/data/nodes/ImageGenNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ImageGenNodeState } from "../../../types/state/nodes/ImageGenNodeState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapImageGenNodeDataToState =
	createDataToStateMapper<ImageGenNodeState>(ImageGenNodeDefaultState);

export const imageGenNodeDataToState = (data: DiagramData): Diagram =>
	mapImageGenNodeDataToState(data as ImageGenNodeData);

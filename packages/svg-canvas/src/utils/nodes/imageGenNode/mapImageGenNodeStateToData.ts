import { ImageGenNodeDefaultData } from "../../../constants/data/nodes/ImageGenNodeDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { ImageGenNodeData } from "../../../types/data/nodes/ImageGenNodeData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ImageGenNodeState } from "../../../types/state/nodes/ImageGenNodeState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapImageGenNodeStateToData =
	createStateToDataMapper<ImageGenNodeData>(ImageGenNodeDefaultData);

export const imageGenNodeStateToData = (state: Diagram): DiagramData =>
	mapImageGenNodeStateToData(state as ImageGenNodeState);

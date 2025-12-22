import { CanvasFrameFeatures } from "../../../types/data/diagrams/CanvasFrameData";
import type { CanvasFrameState } from "../../../types/state/diagrams/CanvasFrameState";
import { CanvasFrameDefaultData } from "../../data/diagrams/CanvasFrameDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

export const CanvasFrameDefaultState = CreateDefaultState<CanvasFrameState>({
	type: "CanvasFrame",
	options: CanvasFrameFeatures,
	baseData: CanvasFrameDefaultData,
	properties: {
		minWidth: 500,
		minHeight: 500,
		itemableType: "canvas",
	},
});

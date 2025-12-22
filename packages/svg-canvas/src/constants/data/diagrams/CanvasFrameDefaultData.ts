import type { CanvasFrameData } from "../../../types/data/diagrams/CanvasFrameData";
import { CanvasFrameFeatures } from "../../../types/data/diagrams/CanvasFrameData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default CanvasFrame data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const CanvasFrameDefaultData = CreateDefaultData<CanvasFrameData>({
	type: "CanvasFrame",
	options: CanvasFrameFeatures,
	properties: {
		width: 500,
		height: 500,
		rotateEnabled: false,
		inversionEnabled: false,
		originX: 0,
		originY: 0,
	},
});

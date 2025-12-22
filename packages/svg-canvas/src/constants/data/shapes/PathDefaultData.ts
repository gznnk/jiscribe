import { CreateDefaultData } from "./CreateDefaultData";
import type { PathData } from "../../../types/data/shapes/PathData";
import { PathFeatures } from "../../../types/data/shapes/PathData";

/**
 * Default path data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const PathDefaultData = CreateDefaultData<PathData>({
	type: "Path",
	options: PathFeatures,
	properties: {
		pathType: "Polyline",
		startArrowHead: "None",
		endArrowHead: "None",
	},
});

import type { HtmlGenNodeData } from "../../../types/data/nodes/HtmlGenNodeData";
import { HtmlGenNodeFeatures } from "../../../types/data/nodes/HtmlGenNodeData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default HTML Generation node data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const HtmlGenNodeDefaultData = CreateDefaultData<HtmlGenNodeData>({
	type: "HtmlGenNode",
	options: HtmlGenNodeFeatures,
	properties: {
		width: 200,
		height: 200,
	},
});

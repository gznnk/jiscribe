import type { TextAreaNodeData } from "../../../types/data/nodes/TextAreaNodeData";
import { TextAreaNodeFeatures } from "../../../types/data/nodes/TextAreaNodeData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default text area node data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const TextAreaNodeDefaultData = CreateDefaultData<TextAreaNodeData>({
	type: "TextAreaNode",
	options: TextAreaNodeFeatures,
	properties: {
		width: 200,
		height: 200,
	},
});

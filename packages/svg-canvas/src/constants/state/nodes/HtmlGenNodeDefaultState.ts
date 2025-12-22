import { HtmlGenNodeFeatures } from "../../../types/data/nodes/HtmlGenNodeData";
import type { HtmlGenNodeState } from "../../../types/state/nodes/HtmlGenNodeState";
import { HtmlGenNodeDefaultData } from "../../data/nodes/HtmlGenNodeDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default HTML Generation node state template.
 */
export const HtmlGenNodeDefaultState = CreateDefaultState<HtmlGenNodeState>({
	type: "HtmlGenNode",
	options: HtmlGenNodeFeatures,
	baseData: HtmlGenNodeDefaultData,
});

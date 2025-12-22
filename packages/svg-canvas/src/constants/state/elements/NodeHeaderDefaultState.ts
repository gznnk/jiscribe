import { NodeHeaderFeatures } from "../../../types/data/elements/NodeHeaderData";
import type { NodeHeaderState } from "../../../types/state/elements/NodeHeaderState";
import { NodeHeaderDefaultData } from "../../data/elements/NodeHeaderDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default state values for NodeHeader
 */
export const NodeHeaderDefaultState: NodeHeaderState =
	CreateDefaultState<NodeHeaderState>({
		type: "NodeHeader",
		options: NodeHeaderFeatures,
		baseData: NodeHeaderDefaultData,
		properties: {
			outlineDisabled: true,
		},
	});

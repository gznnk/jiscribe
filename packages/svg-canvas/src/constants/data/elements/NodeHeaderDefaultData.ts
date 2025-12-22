import type { NodeHeaderData } from "../../../types/data/elements/NodeHeaderData";
import { NodeHeaderFeatures } from "../../../types/data/elements/NodeHeaderData";
import { CreateDefaultData } from "../shapes/CreateDefaultData";

/**
 * Default data values for NodeHeader
 */
export const NodeHeaderDefaultData: NodeHeaderData =
	CreateDefaultData<NodeHeaderData>({
		type: "NodeHeader",
		options: NodeHeaderFeatures,
		properties: {
			height: 30,
			fontColor: "#000000",
			fontSize: 18,
			fontFamily: "Noto Sans JP",
			fontWeight: "400",
			textAlign: "left",
			verticalAlign: "center",
		},
	});

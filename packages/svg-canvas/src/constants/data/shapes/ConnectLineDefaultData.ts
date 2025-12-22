import { CreateDefaultData } from "./CreateDefaultData";
import type { ConnectLineData } from "../../../types/data/shapes/ConnectLineData";
import { ConnectLineFeatures } from "../../../types/data/shapes/ConnectLineData";

/**
 * Default connect line data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const ConnectLineDefaultData = CreateDefaultData<ConnectLineData>({
	type: "ConnectLine",
	options: ConnectLineFeatures,
	properties: {
		pathType: "Rounded",
		stroke: "#374151",
		strokeWidth: 1,
		startOwnerId: "",
		endOwnerId: "",
		autoRouting: true,
		startArrowHead: "None",
		endArrowHead: "FilledTriangle",
	},
});

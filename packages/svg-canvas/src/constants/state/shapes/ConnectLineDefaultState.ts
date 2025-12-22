import { CreateDefaultState } from "./CreateDefaultState";
import { ConnectLineFeatures } from "../../../types/data/shapes/ConnectLineData";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import { ConnectLineDefaultData } from "../../data/shapes/ConnectLineDefaultData";

export const ConnectLineDefaultState = CreateDefaultState<ConnectLineState>({
	type: "ConnectLine",
	options: ConnectLineFeatures,
	baseData: ConnectLineDefaultData,
	properties: {
		outlineDisabled: true,
	},
});

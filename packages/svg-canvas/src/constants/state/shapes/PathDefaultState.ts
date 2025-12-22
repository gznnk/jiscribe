import { CreateDefaultState } from "./CreateDefaultState";
import { PathFeatures } from "../../../types/data/shapes/PathData";
import type { PathState } from "../../../types/state/shapes/PathState";
import { PathDefaultData } from "../../data/shapes/PathDefaultData";

export const PathDefaultState = CreateDefaultState<PathState>({
	type: "Path",
	options: PathFeatures,
	baseData: PathDefaultData,
	properties: {
		outlineDisabled: true,
		hideTransformControl: true,
	},
});

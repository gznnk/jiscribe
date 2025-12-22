import { CreateDefaultState } from "./CreateDefaultState";
import { EllipseFeatures } from "../../../types/data/shapes/EllipseData";
import type { EllipseState } from "../../../types/state/shapes/EllipseState";
import { EllipseDefaultData } from "../../data/shapes/EllipseDefaultData";

export const EllipseDefaultState = CreateDefaultState<EllipseState>({
	type: "Ellipse",
	options: EllipseFeatures,
	baseData: EllipseDefaultData,
	properties: {},
});

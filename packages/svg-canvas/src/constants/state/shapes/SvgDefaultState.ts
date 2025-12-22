import { CreateDefaultState } from "./CreateDefaultState";
import { SvgFeatures } from "../../../types/data/shapes/SvgData";
import type { SvgState } from "../../../types/state/shapes/SvgState";
import { SvgDefaultData } from "../../data/shapes/SvgDefaultData";

/**
 * Default SVG state template.
 */
export const SvgDefaultState = CreateDefaultState<SvgState>({
	type: "Svg",
	options: SvgFeatures,
	baseData: SvgDefaultData,
	properties: {},
});

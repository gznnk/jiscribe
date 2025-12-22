import { CreateDefaultData } from "./CreateDefaultData";
import type { SvgData } from "../../../types/data/shapes/SvgData";
import { SvgFeatures } from "../../../types/data/shapes/SvgData";

/**
 * Default SVG data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const SvgDefaultData = CreateDefaultData<SvgData>({
	type: "Svg",
	options: SvgFeatures,
	properties: {
		initialWidth: 100,
		initialHeight: 100,
		svgText: "",
	},
});

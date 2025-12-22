import { CreateDefaultData } from "./CreateDefaultData";
import type { EllipseData } from "../../../types/data/shapes/EllipseData";
import { EllipseFeatures } from "../../../types/data/shapes/EllipseData";

/**
 * Default ellipse data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const EllipseDefaultData = CreateDefaultData<EllipseData>({
	type: "Ellipse",
	options: EllipseFeatures,
	properties: {},
});

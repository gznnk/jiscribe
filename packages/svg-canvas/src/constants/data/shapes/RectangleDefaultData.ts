import { CreateDefaultData } from "./CreateDefaultData";
import type { RectangleData } from "../../../types/data/shapes/RectangleData";
import { RectangleFeatures } from "../../../types/data/shapes/RectangleData";

/**
 * Default rectangle data template.
 * Generated using Features definition and CreateDefaultData helper with explicit typing.
 */
export const RectangleDefaultData = CreateDefaultData<RectangleData>({
	type: "Rectangle",
	options: RectangleFeatures,
	properties: {
		cornerRadius: 0,
	},
});

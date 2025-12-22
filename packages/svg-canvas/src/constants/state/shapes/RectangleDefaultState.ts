import { CreateDefaultState } from "./CreateDefaultState";
import { RectangleFeatures } from "../../../types/data/shapes/RectangleData";
import type { RectangleState } from "../../../types/state/shapes/RectangleState";
import { RectangleDefaultData } from "../../data/shapes/RectangleDefaultData";

/**
 * Default rectangle state template.
 */
export const RectangleDefaultState = CreateDefaultState<RectangleState>({
	type: "Rectangle",
	options: RectangleFeatures,
	baseData: RectangleDefaultData,
	properties: {},
});

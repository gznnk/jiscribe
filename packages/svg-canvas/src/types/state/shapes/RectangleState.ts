import type { CreateStateType } from "./CreateStateType";
import type {
	RectangleData,
	RectangleFeatures,
} from "../../data/shapes/RectangleData";

/**
 * State type for rectangle shapes.
 * Contains properties specific to rectangular diagram elements.
 */
export type RectangleState = CreateStateType<
	RectangleData,
	typeof RectangleFeatures
>;

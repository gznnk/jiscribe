import type { CreateStateType } from "./CreateStateType";
import type {
	EllipseData,
	EllipseFeatures,
} from "../../data/shapes/EllipseData";

/**
 * State type for ellipse shapes.
 */
export type EllipseState = CreateStateType<EllipseData, typeof EllipseFeatures>;

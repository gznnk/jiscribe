import type { CreateStateType } from "./CreateStateType";
import type { PathData, PathFeatures } from "../../data/shapes/PathData";

/**
 * State type for polyline/path elements.
 */
export type PathState = CreateStateType<PathData, typeof PathFeatures>;

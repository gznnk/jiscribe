import type { PathPointState } from "../../../types/state/shapes/PathPointState";
import { PathPointDefaultData } from "../../data/shapes/PathPointDefaultData";

export const PathPointDefaultState = {
	...PathPointDefaultData,
} as const satisfies PathPointState;

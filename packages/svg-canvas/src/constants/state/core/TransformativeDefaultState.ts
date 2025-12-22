import type { TransformativeState } from "../../../types/state/core/TransformativeState";
import { TransformativeDefaultData } from "../../data/core/TransformativeDefaultData";

export const TransformativeDefaultState = {
	...TransformativeDefaultData,
	isTransforming: false,
} as const satisfies TransformativeState;

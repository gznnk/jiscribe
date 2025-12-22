import type { StrokableState } from "../../../types/state/core/StrokableState";
import { StrokableDefaultData } from "../../data/core/StrokableDefaultData";

export const StrokableDefaultState = {
	...StrokableDefaultData,
} as const satisfies StrokableState;

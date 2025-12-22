import type { FillableState } from "../../../types/state/core/FillableState";
import { FillableDefaultData } from "../../data/core/FillableDefaultData";

export const FillableDefaultState = {
	...FillableDefaultData,
} as const satisfies FillableState;

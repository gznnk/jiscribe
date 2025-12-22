import type { TextableState } from "../../../types/state/core/TextableState";
import { TextableDefaultData } from "../../data/core/TextableDefaultData";

export const TextableDefaultState = {
	...TextableDefaultData,
	isTextEditing: false,
} as const satisfies TextableState;

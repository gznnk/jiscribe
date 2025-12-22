import type { ItemableState } from "../../../types/state/core/ItemableState";
import { ItemableDefaultData } from "../../data/core/ItemableDefaultData";

export const ItemableDefaultState = {
	...ItemableDefaultData,
	itemableType: "group",
} as const satisfies ItemableState;

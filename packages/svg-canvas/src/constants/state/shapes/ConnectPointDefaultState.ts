import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { ConnectPointDefaultData } from "../../data/shapes/ConnectPointDefaultData";
import { SelectableDefaultState } from "../core/SelectableDefaultState";

export const ConnectPointDefaultState = {
	...ConnectPointDefaultData,
	...SelectableDefaultState,
	geometryType: "point",
} as const satisfies ConnectPointState;

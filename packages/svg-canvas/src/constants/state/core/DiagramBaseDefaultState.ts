import type { DiagramBaseState } from "../../../types/state/core/DiagramBaseState";
import { DiagramBaseDefaultData } from "../../data/core/DiagramBaseDefaultData";

export const DiagramBaseDefaultState = {
	...DiagramBaseDefaultData,
	geometryType: "none",
} as const satisfies DiagramBaseState;

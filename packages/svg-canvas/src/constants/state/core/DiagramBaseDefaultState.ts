import type { DiagramBaseState } from "../../../types/state/core/DiagramBaseState";
import { DiagramBaseDefaultData } from "../../data/core/DiagramBaseDefaultData";

export const DiagramBaseDefaultState = {
	...DiagramBaseDefaultData,
} as const satisfies DiagramBaseState;

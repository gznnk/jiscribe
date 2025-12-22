import { StickyDefaultState } from "../../../constants/state/diagrams/StickyDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { StickyState } from "../../../types/state/diagrams/StickyState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapStickyDataToState = createDataToStateMapper<StickyState>(
	StickyDefaultState,
);

export const stickyDataToState = (data: DiagramData): Diagram =>
	mapStickyDataToState(data);
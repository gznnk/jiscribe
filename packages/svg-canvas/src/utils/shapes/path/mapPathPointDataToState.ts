import { PathPointDefaultState } from "../../../constants/state/shapes/PathPointDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapPathPointDataToState = createDataToStateMapper<PathPointState>(
	PathPointDefaultState,
);

export const pathPointDataToState = (data: DiagramData): Diagram =>
	mapPathPointDataToState(data);

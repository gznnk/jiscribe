import { PathDefaultState } from "../../../constants/state/shapes/PathDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { PathState } from "../../../types/state/shapes/PathState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

const baseMapper = createDataToStateMapper<PathState>(PathDefaultState);

export const mapPathDataToState = (data: Partial<PathState>): PathState => {
	const state = baseMapper(data);

	return state;
};

export const pathDataToState = (data: DiagramData): Diagram =>
	mapPathDataToState(data as unknown as PathState);

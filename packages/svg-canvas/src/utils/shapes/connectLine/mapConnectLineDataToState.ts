import { ConnectLineDefaultState } from "../../../constants/state/shapes/ConnectLineDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { PathPointData } from "../../../types/data/shapes/PathPointData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";
import { mapPathPointDataToState } from "../path/mapPathPointDataToState";

const baseMapper = createDataToStateMapper<ConnectLineState>(
	ConnectLineDefaultState,
);

export const mapConnectLineDataToState = (
	data: Partial<ConnectLineState> & { items?: DiagramData[] },
): ConnectLineState => {
	const state = baseMapper(data);

	// Migration: items -> points
	if (
		Array.isArray(data.items) &&
		data.items.length > 0 &&
		(!state.points || state.points.length === 0)
	) {
		state.points = data.items.map((item) =>
			mapPathPointDataToState(item as unknown as PathPointData),
		);
	}

	return state;
};

export const connectLineDataToState = (data: DiagramData): Diagram =>
	mapConnectLineDataToState(data as unknown as ConnectLineState);

import { ConnectPointDefaultState } from "../../../constants/state/shapes/ConnectPointDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapConnectPointDataToState =
	createDataToStateMapper<ConnectPointState>(ConnectPointDefaultState);

export const connectPointDataToState = (data: DiagramData): Diagram =>
	mapConnectPointDataToState(data);

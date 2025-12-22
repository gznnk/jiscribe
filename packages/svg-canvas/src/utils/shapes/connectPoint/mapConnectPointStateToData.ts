import { ConnectPointDefaultData } from "../../../constants/data/shapes/ConnectPointDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { ConnectPointData } from "../../../types/data/shapes/ConnectPointData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapConnectPointStateToData =
	createStateToDataMapper<ConnectPointData>(ConnectPointDefaultData);

export const connectPointStateToData = (state: Diagram): DiagramData =>
	mapConnectPointStateToData(state as ConnectPointState);

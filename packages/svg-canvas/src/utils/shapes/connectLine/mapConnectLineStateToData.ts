import { ConnectLineDefaultData } from "../../../constants/data/shapes/ConnectLineDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { ConnectLineData } from "../../../types/data/shapes/ConnectLineData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapConnectLineStateToData =
	createStateToDataMapper<ConnectLineData>(ConnectLineDefaultData);

export const connectLineStateToData = (state: Diagram): DiagramData =>
	mapConnectLineStateToData(state as ConnectLineState);

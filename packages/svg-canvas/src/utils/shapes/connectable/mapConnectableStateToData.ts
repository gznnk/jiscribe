import { ConnectableDefaultData } from "../../../constants/data/shapes/ConnectableDefaultData";
import type { ConnectableData } from "../../../types/data/shapes/ConnectableData";
import type { ConnectableState } from "../../../types/state/shapes/ConnectableState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapConnectableStateToData =
	createStateToDataMapper<ConnectableData>(ConnectableDefaultData);

export const connectableStateToData = (
	state: ConnectableState,
): ConnectableData => mapConnectableStateToData(state);

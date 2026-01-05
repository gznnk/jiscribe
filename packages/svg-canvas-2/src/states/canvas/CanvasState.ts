import type { ObjectState } from "../objects/base/ObjectState";
import type { ConnectorState } from "../objects/connections/ConnectorState";

export type CanvasState = {
	root: ObjectState[];
	connectors: ConnectorState[];
};

import type { ObjectDoc } from "../objects/base/ObjectDoc";
import type { ConnectorDoc } from "../objects/connections/ConnectorDoc";

export type CanvasDoc = {
	root: ObjectDoc[];
	connectors: ConnectorDoc[];
};

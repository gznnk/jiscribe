import type { ObjectDoc } from "../objects/base/ObjectDoc";
import type { ConnectorDoc } from "../objects/connections/connector/ConnectorDoc";

export type CanvasDoc = CanvasDocV1;

export type CanvasDocAny = CanvasDocV1;

export type CanvasDocV1 = {
	version: 1;
	root: ObjectDoc[];
	connectors: ConnectorDoc[];
};

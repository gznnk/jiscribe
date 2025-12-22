import type { ConnectableData } from "../../data/shapes/ConnectableData";

/**
 * Interface for diagram elements that can have connection points.
 * Extends base data with runtime state that should not be persisted.
 */
export type ConnectableState = ConnectableData & {
	showConnectPoints: boolean;
};

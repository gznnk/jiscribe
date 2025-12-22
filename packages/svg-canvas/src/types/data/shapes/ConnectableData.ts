import type { ConnectPointData } from "./ConnectPointData";

/**
 * Interface for diagram elements that can have connection points.
 * This type is used for elements that can connect to other elements via connection points.
 */
export type ConnectableData = {
	connectEnabled: boolean;
	connectPoints: ConnectPointData[];
};

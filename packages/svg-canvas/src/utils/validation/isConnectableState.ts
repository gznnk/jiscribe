import { isBoolean } from "@workspace/validation";

import { isConnectableData } from "./isConnectableData";
import type { ConnectableState } from "../../types/state/shapes/ConnectableState";

/**
 * Check if an object is ConnectableState.
 *
 * @param obj - The object to check
 * @returns True if the object is ConnectableState, false otherwise
 */
export const isConnectableState = (obj: unknown): obj is ConnectableState => {
	return (
		isConnectableData(obj) &&
		"showConnectPoints" in obj &&
		isBoolean(obj.showConnectPoints)
	);
};

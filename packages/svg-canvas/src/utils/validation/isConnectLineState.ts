import type { ConnectLineState } from "../../types/state/shapes/ConnectLineState";

/**
 * Check if an object is ConnectLineState.
 *
 * @param obj - The object to check
 * @returns True if the object is ConnectLineState, false otherwise
 */
export const isConnectLineState = (obj: unknown): obj is ConnectLineState => {
	return (
		obj !== null &&
		typeof obj === "object" &&
		// DiagramBaseData properties
		"id" in obj &&
		"type" in obj &&
		"x" in obj &&
		"y" in obj &&
		typeof (obj as ConnectLineState).id === "string" &&
		typeof (obj as ConnectLineState).type === "string" &&
		typeof (obj as ConnectLineState).x === "number" &&
		typeof (obj as ConnectLineState).y === "number" &&
		// SelectableState properties
		"isSelected" in obj &&
		"showOutline" in obj &&
		typeof (obj as ConnectLineState).isSelected === "boolean" &&
		typeof (obj as ConnectLineState).showOutline === "boolean" &&
		// StrokableState properties
		"stroke" in obj &&
		"strokeWidth" in obj &&
		typeof (obj as ConnectLineState).stroke === "string" &&
		typeof (obj as ConnectLineState).strokeWidth === "number" &&
		// ConnectLineData specific properties
		"pathType" in obj &&
		"startOwnerId" in obj &&
		"endOwnerId" in obj &&
		"autoRouting" in obj &&
		typeof (obj as ConnectLineState).pathType === "string" &&
		typeof (obj as ConnectLineState).startOwnerId === "string" &&
		typeof (obj as ConnectLineState).endOwnerId === "string" &&
		typeof (obj as ConnectLineState).autoRouting === "boolean"
	);
};

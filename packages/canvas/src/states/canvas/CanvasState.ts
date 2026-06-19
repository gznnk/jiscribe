import type { Viewport } from "./Viewport";
import type { ObjectState } from "../objects/base/ObjectState";

export type CanvasState = {
	/**
	 * Map of all objects in the canvas, normalized by ID.
	 * Key is the object ID, value is the object state.
	 * This flat structure allows O(1) access and updates.
	 */
	objects: Record<string, ObjectState>;

	/**
	 * Sorted list of object IDs at the root level (Z-index order).
	 * Objects in groups are not listed here, but in the group's children array.
	 */
	rootIds: string[];

	/**
	 * List of IDs for independent connectors (if managed separately from root objects).
	 */
	connectorIds: string[];

	/**
	 * Current viewport state.
	 */
	viewport: Viewport;
};

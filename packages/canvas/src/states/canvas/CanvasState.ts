import type { Viewport } from "./Viewport";
import type { ObjectState } from "../objects/base/ObjectState";

/**
 * Normalized runtime state of the canvas: all objects, their root-level
 * stacking order, and the current viewport.
 */
export type CanvasState = {
	/**
	 * Map of all objects in the canvas, normalized by ID.
	 * Key is the object ID, value is the object state.
	 * This flat structure allows O(1) access and updates.
	 */
	objects: Record<string, ObjectState>;

	/**
	 * Sorted list of root-level IDs in Z-index order (back → front).
	 * Holds objects and connectors (type === "connector") mixed together, so the
	 * order is directly the stacking order. Group children do not appear here; they
	 * live in childIds instead. Connectors are never group children and exist only
	 * directly under root.
	 */
	rootIds: string[];

	/**
	 * Current viewport state.
	 */
	viewport: Viewport;
};

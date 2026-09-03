import type { ViewDoc } from "@jiscribe/doc/model/canvas/ViewDoc";

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

	/**
	 * Canvas surface color (doc content, round-tripped through save/history).
	 * Undefined means "follow the theme background" (see CanvasDoc.background).
	 */
	background?: string;

	/**
	 * Display declaration (doc content, round-tripped through save/history): the
	 * padding image exports frame the drawing with, and the open mode the initial
	 * camera was derived from. Undefined means the document declared none (see
	 * CanvasDoc.view).
	 */
	view?: ViewDoc;
};

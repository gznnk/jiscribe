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
	 * Sorted list of root-level IDs in Z-index order (back → front).
	 * オブジェクトとコネクター（type === "connector"）を混在させて保持し、
	 * 並び順がそのまま重なり順になる。group の子はここには現れず childIds 側に入る。
	 * コネクターは group の子にはならず root 直下のみ。
	 */
	rootIds: string[];

	/**
	 * Current viewport state.
	 */
	viewport: Viewport;
};

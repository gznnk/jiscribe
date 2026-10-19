import { calcContentBounds } from "./calcContentBounds";
import { calcViewportForBounds } from "./calcViewportForBounds";
import type { VisualExtentRegistries } from "./VisualExtentRegistries";
import type { Viewport } from "../../rendering/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";

type FitOptions = {
	/** Viewport width in screen px. */
	width: number;
	/** Viewport height in screen px. */
	height: number;
	/** Empty margin (screen px) kept around the content on every side. */
	padding?: number;
};

/**
 * Pure function that computes a Viewport fitting all content (every object
 * except groups).
 *
 * Shared by `ZoomToFitCommand` (Ctrl+0) and the imperative
 * `viewport.fitToContent` so the fit behavior does not drift.
 * Returns `null` when there is no extent to fit (no objects / all degenerate).
 *
 * @param objects - The object map to fit; groups contribute through their children
 * @param options - Viewport size in screen px plus the margin kept around the content
 * @param visualExtentRegistries - Per-canvas registries measuring what is drawn
 *   (see calcContentBounds), so nothing drawn outside the geometry is cropped
 */
export const calcFitViewport = (
	objects: Record<string, ObjectState>,
	{ width, height, padding = 48 }: FitOptions,
	visualExtentRegistries: VisualExtentRegistries,
): Viewport | null => {
	const bounds = calcContentBounds(objects, visualExtentRegistries);
	if (!bounds) {
		return null;
	}
	return calcViewportForBounds(bounds, { width, height, padding });
};

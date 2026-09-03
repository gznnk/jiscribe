import { calcSelectionBounds } from "./calcSelectionBounds";
import { calcViewportForBounds } from "./calcViewportForBounds";
import type { ObjectVisualBoundsRegistry } from "../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import type { Viewport } from "../../states/canvas/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";

type FitOptions = {
	/** Viewport width in screen px. */
	width: number;
	/** Viewport height in screen px. */
	height: number;
	/** Empty margin (screen px) kept around the selection on every side. */
	padding?: number;
};

/**
 * Pure function that computes a Viewport fitting the given selection.
 *
 * The selection counterpart of `calcFitViewport`: shared by
 * `ZoomToSelectionCommand` (Ctrl+2) and the imperative viewport handle so the
 * fit behavior does not drift. Returns `null` when there is no extent to fit
 * (nothing selected / all degenerate).
 *
 * @param selectedIds - Ids to fit; a selected group contributes through its children
 * @param objects - Flat object map, used to resolve group children and geometry
 * @param options - Viewport size in screen px plus the margin kept around the selection
 * @param visualBounds - Per-canvas ObjectVisualBoundsRegistry; omitting it fits
 *   to the geometry boxes and crops what a shape draws outside them
 */
export const calcSelectionFitViewport = (
	selectedIds: readonly string[],
	objects: Record<string, ObjectState>,
	{ width, height, padding = 48 }: FitOptions,
	visualBounds?: Pick<ObjectVisualBoundsRegistry, "get"> | null,
): Viewport | null => {
	const bounds = calcSelectionBounds(selectedIds, objects, visualBounds);
	if (!bounds) {
		return null;
	}
	return calcViewportForBounds(bounds, { width, height, padding });
};

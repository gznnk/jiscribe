// An adapter that maps Canvas's imperative handle onto AiHandleControl. It sits
// here, in one place, so that the hosts carrying a canvas (studio,
// editor-shell) do not each write the same wiring.

import type { CanvasHandle } from "@jiscribe/canvas";

import type { AiHandleControl } from "./types";

/**
 * Builds the way in that joins the Canvas on screen to the AI tools needing a
 * mounted canvas.
 *
 * @param getCanvas - A function returning the handle of the Canvas on screen; it
 *   must return null while no canvas is up (the AI is told as much in the tool
 *   result)
 * @returns The way in to hand to the panel. It is not the same object on every
 *   call, so pin it on the host side with useMemo or the like
 */
export const createCanvasHandleControl = (
	getCanvas: () => CanvasHandle | null,
): AiHandleControl => ({
	isAvailable: () => getCanvas() !== null,

	selectObjects: (ids) => {
		const canvas = getCanvas();
		if (canvas === null) {
			return { selectedIds: [], ignoredIds: ids };
		}
		const { selectedIds, selectedConnectorId, ignoredIds } =
			canvas.selection.select(ids);
		// How the selection is split into channels is the canvas's own business, so
		// the AI gets it levelled into one list of "the ids that were selected"
		return {
			selectedIds:
				selectedConnectorId === null
					? selectedIds
					: [...selectedIds, selectedConnectorId],
			ignoredIds,
		};
	},

	getSelectedIds: () => getCanvas()?.selection.getSelectedIds() ?? [],

	centerView: (point, zoom) =>
		getCanvas()?.viewport.centerOn(point, { zoom }) ?? null,

	setView: (camera) => {
		const viewport = getCanvas()?.viewport;
		if (viewport === undefined) {
			return null;
		}
		viewport.setViewport(camera);
		// SET_CAMERA takes the camera given as it is, but it lands on the next
		// render, so reading getViewport back returns the frame before. The value
		// passed in is what counts as applied
		return camera;
	},

	getView: () => {
		const viewport = getCanvas()?.viewport;
		if (viewport === undefined) {
			return null;
		}
		return {
			viewport: viewport.getViewport(),
			visibleWorldRect: viewport.getVisibleWorldRect(),
		};
	},

	fitView: (target) => {
		const viewport = getCanvas()?.viewport;
		if (viewport === undefined) {
			return null;
		}
		return target === "selection"
			? viewport.fitToSelection()
			: viewport.fitToContent();
	},

	fitViewToRect: (rect) => getCanvas()?.viewport.fitToRect(rect) ?? null,

	measureText: (id, slotId) =>
		getCanvas()?.measure.textSlot(id, slotId) ?? null,

	// With no canvas the [] here reads as "no overlaps at all", but isAvailable
	// turns it away as false before it gets that far (applyHandleOp)
	findOverlaps: (ids) => getCanvas()?.measure.findOverlaps(ids) ?? [],

	measureConnectorPath: (id) => getCanvas()?.measure.connectorPath(id) ?? null,

	measureVisualBounds: (ids) => getCanvas()?.measure.visualBounds(ids) ?? null,

	// As with findOverlaps, the [] returned when there is no canvas is turned away
	// first by isAvailable in applyHandleOp
	hitTest: (target, tolerance) =>
		getCanvas()?.measure.hitTest(target, { tolerance }) ?? [],

	// What the AI reads is how it is drawn, so the .jis.json for re-editing is not
	// embedded (it would make most of the characters a copy of the document, and
	// the budget would run out first)
	toSvgString: () =>
		getCanvas()?.export.toSvgString({ includeSource: false }) ?? null,

	getInteractionStatus: () => getCanvas()?.interaction.getStatus() ?? null,

	toWorld: (clientPoint) => getCanvas()?.viewport.toWorld(clientPoint) ?? null,

	toClient: (worldPoint) => getCanvas()?.viewport.toClient(worldPoint) ?? null,
});

import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import { roundToDecimal } from "@jiscribe/geometry";
import type { BoundingBox } from "@jiscribe/geometry";

import { calcCameraToRevealBox } from "./calcCameraToRevealBox";
import { calcSelectionBounds } from "./calcSelectionBounds";
import { calcViewportForBounds } from "./calcViewportForBounds";
import { ZOOM } from "../../constants/zoom";
import type { ObjectVisualBoundsRegistry } from "../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import type { Camera, Viewport } from "../../states/canvas/Viewport";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/** Margin kept between the revealed change and the viewport edge, in screen px. */
const REVEAL_PADDING = 24;

/**
 * How far a reveal may zoom out, as a divisor of the zoom the user is at.
 *
 * A change too big to show at the current zoom is worth stepping back for, but
 * undoing an edit that touched the whole drawing must not answer by dropping the
 * user off at 10%: past a few steps back the shapes stop being readable and the
 * view is no longer anywhere they were working. At the limit the change is
 * centered instead, which still says where it happened.
 */
const MAX_ZOOM_OUT = 4;

type HistoryRevealParams = {
	/** Ids the crossed history edge touched (see `DocSnapshot.changedIds`). */
	changedIds: readonly string[];
	/** The object map being navigated away from; the only place a deleted object still exists. */
	before: Record<string, ObjectState>;
	/** The restored object map. */
	after: Record<string, ObjectState>;
	/** The viewport as the user left it; its size is what "fits" is measured against. */
	viewport: Viewport;
	/** Per-canvas registry, so a shape drawing outside its geometry box is revealed whole. */
	visualBounds: Pick<ObjectVisualBoundsRegistry, "get">;
};

/**
 * The world-coordinate box the changed objects occupy across both states.
 *
 * An id is measured where it ends up, and only an id the restore removes is
 * measured where it was — undoing a move then frames where the object landed
 * rather than the span it travelled, while undoing a paste still points at the
 * hole the objects left.
 */
const calcChangedBounds = ({
	changedIds,
	before,
	after,
	visualBounds,
}: HistoryRevealParams): BoundingBox | null => {
	const restoredIds = changedIds.filter((id) => after[id] !== undefined);
	const removedIds = changedIds.filter((id) => after[id] === undefined);

	const restoredBounds = calcSelectionBounds(restoredIds, after, visualBounds);
	const removedBounds = calcSelectionBounds(removedIds, before, visualBounds);

	if (restoredBounds === null) {
		return removedBounds;
	}
	if (removedBounds === null) {
		return restoredBounds;
	}
	return {
		left: Math.min(restoredBounds.left, removedBounds.left),
		top: Math.min(restoredBounds.top, removedBounds.top),
		right: Math.max(restoredBounds.right, removedBounds.right),
		bottom: Math.max(restoredBounds.bottom, removedBounds.bottom),
	};
};

/** The camera showing `bounds` in the middle of the viewport at `zoom`. */
const centerOnBounds = (
	bounds: BoundingBox,
	{ width, height }: Viewport,
	zoom: number,
): Camera => ({
	minX: roundToDecimal(
		(bounds.left + bounds.right) / 2 - width / (2 * zoom),
		PRECISION.COORDINATE,
	),
	minY: roundToDecimal(
		(bounds.top + bounds.bottom) / 2 - height / (2 * zoom),
		PRECISION.COORDINATE,
	),
	zoom,
});

/**
 * Where the camera has to move for undo / redo to be visible, or null when it
 * does not have to move at all.
 *
 * History navigation preserves the viewport on purpose — the camera is the
 * user's, not something the history restores — so a change outside the visible
 * rect would otherwise land with nothing on screen reacting to it. This answers
 * the smaller question instead: show what just changed, from wherever the user
 * is looking. A change already on screen returns null, so the common case moves
 * nothing.
 *
 * Panning is preferred over zooming: the user's scale is left alone whenever the
 * change fits at it, and a change too big to fit is zoomed out to at most
 * {@link MAX_ZOOM_OUT}× — never in, so a reveal cannot magnify the drawing past
 * where the user set it.
 *
 * @param params - See {@link HistoryRevealParams}
 * @returns The camera to move to, or null when the change is already visible,
 *   nothing changed, or nothing that changed has an extent to show (an unmeasurable
 *   object, ids that no longer resolve)
 */
export const calcHistoryRevealCamera = (
	params: HistoryRevealParams,
): Camera | null => {
	const { changedIds, viewport } = params;
	if (changedIds.length === 0 || viewport.width <= 0 || viewport.height <= 0) {
		return null;
	}

	const bounds = calcChangedBounds(params);
	if (bounds === null) {
		return null;
	}

	const padding = REVEAL_PADDING / viewport.zoom;
	const fitsAtCurrentZoom =
		bounds.right - bounds.left + 2 * padding <=
			viewport.width / viewport.zoom &&
		bounds.bottom - bounds.top + 2 * padding <= viewport.height / viewport.zoom;
	if (fitsAtCurrentZoom) {
		return calcCameraToRevealBox(viewport, bounds, REVEAL_PADDING);
	}

	const fitted = calcViewportForBounds(bounds, {
		width: viewport.width,
		height: viewport.height,
		padding: REVEAL_PADDING,
	});
	// Both axes degenerate (a zero-size box), which the fit cannot frame and the
	// pan above can: it needs no size to put a point on screen.
	if (fitted === null) {
		return calcCameraToRevealBox(viewport, bounds, REVEAL_PADDING);
	}

	const zoom = roundToDecimal(
		Math.max(fitted.zoom, viewport.zoom / MAX_ZOOM_OUT, ZOOM.MIN),
		ZOOM.PRECISION,
	);
	return centerOnBounds(bounds, viewport, zoom);
};

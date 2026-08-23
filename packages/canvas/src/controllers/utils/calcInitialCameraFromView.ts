import type {
	ViewOpenMode,
	ViewPaddingDoc,
} from "@jiscribe/doc/model/canvas/ViewDoc";
import { resolveViewPadding } from "@jiscribe/doc/model/canvas/ViewDoc";
import { PRECISION } from "@jiscribe/doc/model/objects/utils/precision";
import { roundToDecimal } from "@jiscribe/geometry";
import type { BoundingBox, Dimensions } from "@jiscribe/geometry";

import { ZOOM } from "../../constants/zoom";
import type { Camera } from "../../states/canvas/Viewport";

/** The zoom range the resulting camera is clamped into. */
export type ZoomLimits = {
	/** Smallest allowed zoom factor; 1 means 100%. */
	min: number;
	/** Largest allowed zoom factor. */
	max: number;
};

/**
 * Which axes each open mode fits. The rest of the framing follows from this:
 * a fitted axis centers the padded box in the viewport, an unfitted one starts
 * at that axis's start edge of the padded box.
 *
 * A future `"fit-height"` is one row — `{ x: false, y: true }` — and the anchor
 * rule then puts it at the padded box's left edge without further code.
 */
const FITTED_AXES: Record<ViewOpenMode, { x: boolean; y: boolean }> = {
	"fit-width": { x: true, y: false },
	"fit-all": { x: true, y: true },
};

/**
 * Pure function that derives the camera a document's `view.open` asks for.
 *
 * What is fitted is the **padded box** — the content bounds grown by
 * `view.padding` — so the padding a rendered image gets is the same padding the
 * opened view shows, and both are expressed in world px. The zoom is the largest
 * that still fits the padded box on the axes the mode names, clamped into
 * `zoomLimits`; no extra ceiling of its own is imposed. Nothing here constrains
 * editing: the result is a starting camera, not a boundary.
 *
 * @param bounds - World-space content extent, before any padding is applied
 * @param padding - The document's `view.padding`; undefined is zero on every side
 * @param open - The mode to frame by; see {@link FITTED_AXES} for the axes each fits
 * @param viewportSize - Container size in screen px. A zero or negative side has
 *   no framing to compute, so it yields null rather than a guessed camera
 * @param zoomLimits - The canvas's zoom range, applied as a clamp on the fitted zoom
 * @returns The camera to start at, or null when there is nothing to fit — a zero
 *   viewport, or a padded box with no extent on an axis the mode has to fit
 *   (a purely vertical drawing under `"fit-width"` with no horizontal padding).
 *   Null means "no opinion": the caller keeps the camera it already had.
 */
export const calcInitialCameraFromView = (
	bounds: BoundingBox,
	padding: ViewPaddingDoc | undefined,
	open: ViewOpenMode,
	viewportSize: Dimensions,
	zoomLimits: ZoomLimits,
): Camera | null => {
	const { width, height } = viewportSize;
	if (width <= 0 || height <= 0) {
		return null;
	}

	const resolvedPadding = resolveViewPadding(padding);
	const paddedLeft = bounds.left - resolvedPadding.left;
	const paddedTop = bounds.top - resolvedPadding.top;
	const paddedWidth =
		bounds.right - bounds.left + resolvedPadding.left + resolvedPadding.right;
	const paddedHeight =
		bounds.bottom - bounds.top + resolvedPadding.top + resolvedPadding.bottom;

	const fitted = FITTED_AXES[open];
	const zoomCandidates = [
		fitted.x && paddedWidth > 0 ? width / paddedWidth : null,
		fitted.y && paddedHeight > 0 ? height / paddedHeight : null,
	].filter((candidate): candidate is number => candidate !== null);
	if (zoomCandidates.length === 0) {
		return null;
	}

	const zoom = Math.max(
		zoomLimits.min,
		Math.min(zoomLimits.max, Math.min(...zoomCandidates)),
	);

	// The unrounded zoom is what the offsets are derived from (as in
	// calcViewportForBounds), so rounding the zoom cannot shift the framing.
	const minX = fitted.x
		? paddedLeft + paddedWidth / 2 - width / (2 * zoom)
		: paddedLeft;
	const minY = fitted.y
		? paddedTop + paddedHeight / 2 - height / (2 * zoom)
		: paddedTop;

	return {
		zoom: roundToDecimal(zoom, ZOOM.PRECISION),
		minX: roundToDecimal(minX, PRECISION.COORDINATE),
		minY: roundToDecimal(minY, PRECISION.COORDINATE),
	};
};

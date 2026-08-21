import { PRECISION } from "@jiscribe/doc/model/precision";
import { roundToDecimal } from "@jiscribe/geometry";
import type { BoundingBox } from "@jiscribe/geometry";

import { ZOOM } from "../../constants/zoom";
import type { Viewport } from "../../states/canvas/Viewport";

type FitOptions = {
	/** Viewport width in screen px. */
	width: number;
	/** Viewport height in screen px. */
	height: number;
	/** Empty margin (screen px) kept around the content on every side. */
	padding?: number;
};

/**
 * Pure function that computes a Viewport fitting the given content bounds.
 *
 * Shared by `calcFitViewport` (whole content) and `calcSelectionFitViewport`
 * (selection) so the fit behavior does not drift.
 *
 * Treats width and height as separate zoom candidates and derives the fit
 * ratio from only the valid axes (size > 0), so horizontal/vertical lines
 * (with one axis of size 0) still fit along their axis. Returns `null` when
 * both axes are degenerate (single-point Poly, degenerate Frame, etc.).
 */
export const calcViewportForBounds = (
	bounds: BoundingBox,
	{ width, height, padding = 48 }: FitOptions,
): Viewport | null => {
	const contentWidth = bounds.right - bounds.left;
	const contentHeight = bounds.bottom - bounds.top;
	const contentCx = (bounds.left + bounds.right) / 2;
	const contentCy = (bounds.top + bounds.bottom) / 2;

	const availableW = width - 2 * padding;
	const availableH = height - 2 * padding;

	const zoomCandidates = [
		contentWidth > 0 ? availableW / contentWidth : null,
		contentHeight > 0 ? availableH / contentHeight : null,
	].filter((v): v is number => v !== null);
	// Zero size on both axes (single-point Poly, degenerate Frame, etc.) cannot be fit -> null.
	if (zoomCandidates.length === 0) {
		return null;
	}

	const zoom = Math.max(
		ZOOM.MIN,
		Math.min(ZOOM.MAX, Math.min(...zoomCandidates)),
	);

	return {
		width,
		height,
		zoom: roundToDecimal(zoom, PRECISION.ZOOM),
		minX: roundToDecimal(contentCx - width / (2 * zoom), PRECISION.COORDINATE),
		minY: roundToDecimal(contentCy - height / (2 * zoom), PRECISION.COORDINATE),
	};
};

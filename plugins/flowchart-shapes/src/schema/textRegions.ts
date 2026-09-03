// Where each flowchart shape lays its text out, declared once for both halves of
// its definition: the doc definition (./doc.ts, what a headless overflow check
// measures against) and the UI definition (../definitions.ts, what the overlay
// draws and the editor edits in). Headless on purpose — a number here is derived
// from the very ratio the outline is drawn from, so the two cannot drift.
//
// `cross` and `extract` are absent: their drawing fills the box and the label
// hangs below it, sized from its own text, so they declare
// `calcOutsideBoxTextRegion` instead.
import { createInsetTextRegion } from "@jiscribe/canvas-sdk/doc";
import type { Dimensions, Rect } from "@jiscribe/geometry";
import { calcInsetRect } from "@jiscribe/geometry";

import { CARD_CUT_RATIO } from "./card/CardDoc";
import { DB_CAP_RATIO } from "./db/DbDoc";
import { DIAMOND_INSET } from "./diamond/DiamondDoc";
import { DISPLAY_CAP_RATIO, DISPLAY_LEFT_RATIO } from "./display/DisplayDoc";
import { DOCUMENT_WAVE_RATIO } from "./document/DocumentDoc";
import { HEXAGON_CAP_RATIO } from "./hexagon/HexagonDoc";
import { LOOP_LIMIT_CUT_RATIO } from "./loopLimit/LoopLimitDoc";
import { MANUAL_INPUT_SLOPE_RATIO } from "./manualInput/ManualInputDoc";
import { MULTI_DOCUMENT_OFFSET_RATIO } from "./multiDocument/MultiDocumentDoc";
import { OFF_PAGE_CONNECTOR_TIP_RATIO } from "./offPageConnector/OffPageConnectorDoc";
import { PARALLELOGRAM_SKEW_RATIO } from "./parallelogram/ParallelogramDoc";
import { STORED_DATA_CAP_RATIO } from "./storedData/StoredDataDoc";
import { SUBROUTINE_BAR_RATIO } from "./subroutine/SubroutineDoc";
import { TRAPEZOID_SLOPE_RATIO } from "./trapezoid/TrapezoidDoc";

/**
 * Insets the top by the corner cut so the region sits fully below the bevel
 * (the card is full-width beneath it). The cut follows the shorter side
 * (min(w, h) * CARD_CUT_RATIO), so a constant ratio would let the top edge
 * poke into the removed corner at non-square aspect ratios.
 *
 * @param doc - The card's untransformed box; the cut is taken from the shorter side, so both matter
 * @returns The region in local coordinates (shape center as origin)
 */
export const calcCardTextRegion = ({ width, height }: Dimensions): Rect => {
	const cut = Math.min(width, height) * CARD_CUT_RATIO;
	return calcInsetRect({ cx: 0, cy: 0, width, height }, { top: cut / height });
};

/**
 * Restricts to the straight-sided cylinder body: below the full top cap ellipse
 * (2 * DB_CAP_RATIO) and above the bottom bulge (DB_CAP_RATIO), so text never
 * spills over the curved bottom at any aspect ratio.
 */
export const calcDbTextRegion = createInsetTextRegion({
	top: DB_CAP_RATIO * 2,
	bottom: DB_CAP_RATIO,
});

/**
 * Insets the right by the cap radius (height / 2) so the full-height region
 * ends where the straight top/bottom edges meet the semicircular cap. A
 * constant ratio overflows the right corners once height exceeds 0.4 * width.
 *
 * @param doc - The delay's untransformed box; the cap radius is half the height, so the inset ratio depends on the width too
 * @returns The region in local coordinates (shape center as origin)
 */
export const calcDelayTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{ right: height / (2 * width) },
	);

/** Insets every side to the rhombus's own inscribed rectangle. */
export const calcDiamondTextRegion = createInsetTextRegion({
	top: DIAMOND_INSET,
	right: DIAMOND_INSET,
	bottom: DIAMOND_INSET,
	left: DIAMOND_INSET,
});

/** Insets the pointed left and rounded right so text sits in the flat middle band. */
export const calcDisplayTextRegion = createInsetTextRegion({
	left: DISPLAY_LEFT_RATIO,
	right: DISPLAY_CAP_RATIO,
});

/**
 * Stops the region above the wavy bottom edge (the wave swings one amplitude
 * around its centerline, so it costs twice the ratio).
 */
export const calcDocumentTextRegion = createInsetTextRegion({
	bottom: DOCUMENT_WAVE_RATIO * 2,
});

/**
 * Insets by a full cap on both sides so the region aligns with the top/bottom
 * edges between the pointed caps.
 */
export const calcHexagonTextRegion = createInsetTextRegion({
	left: HEXAGON_CAP_RATIO,
	right: HEXAGON_CAP_RATIO,
});

/**
 * Insets the top by the corner cut so the region sits fully below the bevels
 * (the shape is full-width beneath them). The cut follows the shorter side
 * (min(w, h) * LOOP_LIMIT_CUT_RATIO), so a constant ratio would let the top
 * edge poke into the removed corners at non-square aspect ratios.
 *
 * @param doc - The shape's untransformed box; the cut is taken from the shorter side, so both matter
 * @returns The region in local coordinates (shape center as origin)
 */
export const calcLoopLimitTextRegion = ({
	width,
	height,
}: Dimensions): Rect => {
	const cut = Math.min(width, height) * LOOP_LIMIT_CUT_RATIO;
	return calcInsetRect({ cx: 0, cy: 0, width, height }, { top: cut / height });
};

/** Insets the top by the full slope so text stays below the sloping top edge. */
export const calcManualInputTextRegion = createInsetTextRegion({
	top: MANUAL_INPUT_SLOPE_RATIO,
});

/**
 * Confines text to the front sheet: insets the top/right by the two sheet
 * offsets and the bottom by the front sheet's wave band.
 *
 * @param doc - The shape's untransformed box; the sheet offset is taken from the shorter side, so both matter
 * @returns The region in local coordinates (shape center as origin)
 */
export const calcMultiDocumentTextRegion = ({
	width,
	height,
}: Dimensions): Rect => {
	const offset = Math.min(width, height) * MULTI_DOCUMENT_OFFSET_RATIO;
	const sheetHeight = height - 2 * offset;
	return calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: (2 * offset) / height,
			right: (2 * offset) / width,
			bottom: (sheetHeight * DOCUMENT_WAVE_RATIO * 2) / height,
		},
	);
};

/**
 * Insets the bottom by a full tip height so text stays in the rectangular band
 * above the point.
 */
export const calcOffPageConnectorTextRegion = createInsetTextRegion({
	bottom: OFF_PAGE_CONNECTOR_TIP_RATIO,
});

/**
 * Insets by a full skew on both sides so the region aligns with the slanted
 * left/right edges.
 */
export const calcParallelogramTextRegion = createInsetTextRegion({
	left: PARALLELOGRAM_SKEW_RATIO,
	right: PARALLELOGRAM_SKEW_RATIO,
});

/**
 * Insets by a full cap radius (half the short side) on the capped axis so the
 * region aligns with the flat edges between the semicircular caps. The caps
 * sit on the long axis: left/right when wide, top/bottom when tall.
 *
 * @param doc - The stadium's untransformed box; which axis is capped follows from which side is longer
 * @returns The region in local coordinates (shape center as origin)
 */
export const calcStadiumTextRegion = ({ width, height }: Dimensions): Rect => {
	const capRadius = Math.min(width, height) / 2;
	if (width >= height) {
		return {
			x: -width / 2 + capRadius,
			y: -height / 2,
			width: width - capRadius * 2,
			height,
		};
	}
	return {
		x: -width / 2,
		y: -height / 2 + capRadius,
		width,
		height: height - capRadius * 2,
	};
};

/**
 * Insets both sides by the arc depth: the region starts where the straight
 * top/bottom edges begin (left) and stops at the concave right arc's apex.
 */
export const calcStoredDataTextRegion = createInsetTextRegion({
	left: STORED_DATA_CAP_RATIO,
	right: STORED_DATA_CAP_RATIO,
});

/** Insets by one bar width on each side so text sits between the two vertical bars. */
export const calcSubroutineTextRegion = createInsetTextRegion({
	left: SUBROUTINE_BAR_RATIO,
	right: SUBROUTINE_BAR_RATIO,
});

/**
 * Insets each side by the full slope so the region matches the narrow bottom
 * edge and text never crosses the slanted sides.
 */
export const calcTrapezoidTextRegion = createInsetTextRegion({
	left: TRAPEZOID_SLOPE_RATIO,
	right: TRAPEZOID_SLOPE_RATIO,
});

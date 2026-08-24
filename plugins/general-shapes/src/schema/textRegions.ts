// Where each general shape lays its text out, declared once for both halves of
// its definition: the doc definition (./doc.ts, what a headless overflow check
// measures against) and the UI definition (../definition.ts, what the overlay
// draws and the editor edits in). Headless on purpose — a number here is derived
// from the very ratio the drawing is built from, so the two cannot drift.
//
// The pictograms (actor / server / package / envelope / queue / gear / lock) are
// absent: their drawing fills the box and the label hangs below it, sized from
// its own text, so they declare `calcOutsideBoxTextRegion` instead.
import { createInsetTextRegion } from "@jiscribe/canvas-sdk/doc";
import type { Dimensions, Rect } from "@jiscribe/geometry";
import { calcInsetRect } from "@jiscribe/geometry";

import { CLOUD_TEXT_INSETS } from "./cloud/CloudDoc";
import { calcFileFoldSize } from "./file/calcFileFoldSize";
import { FOLDER_TAB_HEIGHT_RATIO } from "./folder/FolderDoc";
import {
	LAPTOP_SCREEN_HEIGHT_RATIO,
	LAPTOP_SCREEN_X_RATIO,
} from "./laptop/LaptopDoc";
import { WINDOW_TITLE_BAR_RATIO } from "./shared/windowFrameRatios";
import { SHIELD_SHOULDER_RATIO } from "./shield/ShieldDoc";
import {
	SMARTPHONE_SCREEN_HEIGHT_RATIO,
	SMARTPHONE_SCREEN_X_RATIO,
	SMARTPHONE_SCREEN_Y_RATIO,
} from "./smartphone/SmartphoneDoc";

/** Gap between a silhouette (or a title bar) and the text, as a ratio of the box. */
const TEXT_PADDING_RATIO = 0.06;

/** Insets the box by the bumps, so the text stays in the cloud's flat middle. */
export const calcCloudTextRegion = createInsetTextRegion(CLOUD_TEXT_INSETS);

/**
 * Places the text of a window shape in the content area under the title bar, so
 * a long line cannot run into the bar. Shared by the browser and the terminal,
 * which put their marks in the bar and leave the content area clear.
 */
export const calcWindowTextRegion = createInsetTextRegion({
	top: WINDOW_TITLE_BAR_RATIO + TEXT_PADDING_RATIO,
	right: TEXT_PADDING_RATIO,
	bottom: TEXT_PADDING_RATIO,
	left: TEXT_PADDING_RATIO,
});

/**
 * Places the text in the body below the tab, so a first line cannot run into the
 * notch the tab leaves on the top-right.
 */
export const calcFolderTextRegion = createInsetTextRegion({
	top: FOLDER_TAB_HEIGHT_RATIO + TEXT_PADDING_RATIO,
	right: TEXT_PADDING_RATIO,
	bottom: TEXT_PADDING_RATIO,
	left: TEXT_PADDING_RATIO,
});

/**
 * Places the text below the folded corner, so a first line cannot run under the
 * fold. The fold is not a fixed fraction of the height (calcFileFoldSize), so the
 * top inset is derived rather than declared.
 *
 * @param doc - The file's untransformed box; the fold is the smaller of a width and a height ratio, so both matter
 * @returns The region in local coordinates (shape center as origin)
 */
export const calcFileTextRegion = ({ width, height }: Dimensions): Rect =>
	calcInsetRect(
		{ cx: 0, cy: 0, width, height },
		{
			top: calcFileFoldSize(width, height) / height + TEXT_PADDING_RATIO,
			right: TEXT_PADDING_RATIO,
			bottom: TEXT_PADDING_RATIO,
			left: TEXT_PADDING_RATIO,
		},
	);

/** Gap between the shield's edge and the text, as a ratio of the box. */
const SHIELD_TEXT_PADDING_RATIO = 0.07;

/**
 * Keeps the text in the shield's straight-sided upper part, above the shoulders
 * where the flanks start closing in on the tip. The lower part is left empty on
 * purpose: a centered line there would sit in the taper and clip on both sides.
 */
export const calcShieldTextRegion = createInsetTextRegion({
	top: SHIELD_TEXT_PADDING_RATIO,
	right: SHIELD_TEXT_PADDING_RATIO,
	bottom: 1 - SHIELD_SHOULDER_RATIO,
	left: SHIELD_TEXT_PADDING_RATIO,
});

/** Gap between the screen edge and the text, as a ratio of the box. */
const SCREEN_TEXT_PADDING_RATIO = 0.04;

/** Puts the text on the screen, clear of the case, the speaker slit and the home bar. */
export const calcSmartphoneTextRegion = createInsetTextRegion({
	top: SMARTPHONE_SCREEN_Y_RATIO + SCREEN_TEXT_PADDING_RATIO,
	right: SMARTPHONE_SCREEN_X_RATIO + SCREEN_TEXT_PADDING_RATIO,
	bottom:
		1 -
		SMARTPHONE_SCREEN_Y_RATIO -
		SMARTPHONE_SCREEN_HEIGHT_RATIO +
		SCREEN_TEXT_PADDING_RATIO,
	left: SMARTPHONE_SCREEN_X_RATIO + SCREEN_TEXT_PADDING_RATIO,
});

/** Gap between the laptop's screen edge and the text, as a ratio of the box. */
const LAPTOP_TEXT_PADDING_RATIO = 0.05;

/** Puts the text on the screen, so it stays clear of the base below it. */
export const calcLaptopTextRegion = createInsetTextRegion({
	top: LAPTOP_TEXT_PADDING_RATIO,
	right: LAPTOP_SCREEN_X_RATIO + LAPTOP_TEXT_PADDING_RATIO,
	bottom: 1 - LAPTOP_SCREEN_HEIGHT_RATIO + LAPTOP_TEXT_PADDING_RATIO,
	left: LAPTOP_SCREEN_X_RATIO + LAPTOP_TEXT_PADDING_RATIO,
});

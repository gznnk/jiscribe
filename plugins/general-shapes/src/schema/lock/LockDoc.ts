import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import { AUTO_COLOR } from "@workspace/canvas/unstable-doc";

import { BELOW_LABEL_STYLE_DEFAULTS } from "../shared/BelowLabelStyleDefaults";

/**
 * A padlock, used for authentication and for protected resources.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is drawn as a label below the box, auto-sized to the text itself, so it stays readable at any box size.
 */
export const LockFeatures = {
	type: "lock",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Body block geometry, as fractions of the box: where its top edge sits, how far
 * its sides are inset, and its corner radius (a fraction of the shorter side).
 * Shared by the silhouette and the outline.
 */
export const LOCK_BODY_TOP_RATIO = 0.42;
export const LOCK_BODY_X_RATIO = 0.06;
export const LOCK_BODY_CORNER_RATIO = 0.09;

/**
 * Shackle geometry: half its span as a fraction of the width, and where its
 * shoulders sit plus how far it arches above them as fractions of the height.
 * Shared by the silhouette and the outline, which traces the arch as the shape's
 * visible upper edge even though the shackle encloses nothing on its own.
 */
export const LOCK_SHACKLE_HALF_WIDTH_RATIO = 0.24;
export const LOCK_SHACKLE_SHOULDER_RATIO = 0.3;
export const LOCK_SHACKLE_ARCH_RATIO = 0.2;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const LockDocBrand: unique symbol;

export type LockDoc = CreateObjectType<
	typeof LockFeatures,
	typeof LockDocBrand
>;

export const LOCK_DOC_DEFAULTS: Omit<LockDoc, "id"> = {
	type: "lock",
	x: 0,
	y: 0,
	width: 90,
	height: 110,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as LockDoc;

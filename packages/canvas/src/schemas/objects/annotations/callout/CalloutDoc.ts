import { isEnum, isNumber, isObject } from "@workspace/basic-validators";

import { DEFAULT_FONT_FAMILY } from "../../../../constants/defaultFontFamily";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";

/**
 * Depth of the tail band as a fraction of the box's cross dimension (height
 * for a top/bottom tail, width for a left/right tail). The bubble body fills
 * the rest and the tail stays inside the bounding box. Shared by the renderer
 * (path), the outline, and the text region inset so they can never drift apart.
 */
export const CALLOUT_TAIL_RATIO = 0.25;

/** Width of the tail base as a fraction of the edge the tail sits on. */
export const CALLOUT_TAIL_BASE_RATIO = 0.2;

/**
 * Fixed base-slot centers as fractions of the edge. The base does not follow
 * the tip: it sits in the start slot while the tip is on the first half of the
 * edge (position < 0.5) and in the end slot otherwise, so the tail always
 * leans like a classic speech bubble instead of dropping straight out.
 */
export const CALLOUT_TAIL_BASE_SLOTS = { start: 0.3, end: 0.7 } as const;

/** Edges the tail tip can sit on. */
export const CALLOUT_TAIL_SIDES = ["top", "right", "bottom", "left"] as const;

export type CalloutTailSide = (typeof CALLOUT_TAIL_SIDES)[number];

/**
 * Tail geometry: the tip sits on the bounding box's `side` edge at `position`
 * (0..1 along that edge, left-to-right / top-to-bottom). The base sits in one
 * of two fixed slots on the body edge (CALLOUT_TAIL_BASE_SLOTS), chosen by
 * which half of the edge the tip is on.
 */
export type CalloutTail = {
	side: CalloutTailSide;
	position: number;
};

/**
 * Tail used when the field is absent: down-left, close to (but not identical
 * with) the historical fixed tail — the base now sits in the start slot
 * (0.2w–0.4w) instead of the old hand-tuned 0.25w–0.45w.
 */
export const CALLOUT_TAIL_DEFAULT: CalloutTail = {
	side: "bottom",
	position: 0.2,
};

/** Type guard for CalloutTailSide. */
export const isCalloutTailSide = isEnum(CALLOUT_TAIL_SIDES);

/** Type guard for CalloutTail (side enum + position in [0, 1]). */
export const isCalloutTail = (value: unknown): value is CalloutTail => {
	if (!isObject(value)) {
		return false;
	}
	const tail = value as Record<string, unknown>;
	return (
		isCalloutTailSide(tail.side) &&
		isNumber(tail.position) &&
		tail.position >= 0 &&
		tail.position <= 1
	);
};

/**
 * A speech-bubble callout used for annotations and explanatory comments.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * bubble with a tail (`tail`: side + position, default down-left), drawn inside
 * the bounding box so selection, transforms, and connector outline connections
 * work with the same mechanism as Rect.
 */
export const CalloutFeatures = {
	type: "callout",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CalloutDocBrand: unique symbol;

export type CalloutDoc = CreateObjectType<
	typeof CalloutFeatures,
	typeof CalloutDocBrand,
	{
		/** Tail placement. Omitted = CALLOUT_TAIL_DEFAULT (bottom, 0.2). */
		tail?: CalloutTail;
	}
>;

export const CALLOUT_DOC_DEFAULTS: Omit<CalloutDoc, "id"> = {
	type: "callout",
	x: 0,
	y: 0,
	width: 160,
	height: 110,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as CalloutDoc;

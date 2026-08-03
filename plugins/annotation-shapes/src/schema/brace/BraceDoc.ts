import { isEnum, isNumber } from "@workspace/basic-validators";
import type {
	CreateObjectType,
	ExtraStylePropertyDescriptor,
	ObjectFeatures,
} from "@workspace/canvas/doc";
import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@workspace/canvas/unstable-doc";

/**
 * Directions the tip can point. The tip points *away* from what the brace
 * groups, so the arms reach the opposite edge of the box, where the grouped
 * shapes sit: a `left` brace is the typographic `{`, grouping what is to its
 * right.
 */
export const BRACE_DIRECTIONS = ["left", "right", "up", "down"] as const;

export type BraceDirection = (typeof BRACE_DIRECTIONS)[number];

/** Direction used when the field is absent: the typographic `{`. */
export const BRACE_DIRECTION_DEFAULT: BraceDirection = "left";

/** Tip position used when the field is absent: the middle of the span. */
export const BRACE_TIP_POSITION_DEFAULT = 0.5;

/**
 * Empty band between the tip and the label box. Wider than the below-label gap
 * of the pictograms (BELOW_LABEL_GAP = 4), because the tip is a point rather
 * than a full edge and a label pressed against it reads as touching the curve.
 */
export const BRACE_LABEL_GAP = 8;

/** Type guard for BraceDirection. */
export const isBraceDirection = isEnum(BRACE_DIRECTIONS);

/** Type guard for the tip position: a number in [0, 1]. */
export const isBraceTipPosition = (value: unknown): value is number =>
	isNumber(value) && value >= 0 && value <= 1;

/**
 * A curly brace used to mark a run of shapes as one group and name it.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering, so
 * transforms and selection work with the same mechanism as Rect. The box is the
 * bracket alone: its short side is the depth the curve bulges by, its long side
 * the span the arms cover. The label is *not* in the box — it is sized from its
 * own text and hung off the tip (calcBraceTextRegion), so naming the group never
 * competes with the bracket for room.
 *
 * The brace carries no fill: the path is open, so a fill would paint the region
 * between the arms rather than the shape.
 */
export const BraceFeatures = {
	type: "brace",
	geometry: "rect",
	transform: true,
	stroke: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Both fields the brace adds are styleable, so a host can drive them through
 * `onPropertyUpdate` (there is no built-in menu section for them yet).
 */
export const BraceExtraStyleProperties = {
	direction: { valueType: "string" },
	tipPosition: { valueType: "number" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BraceDocBrand: unique symbol;

export type BraceDoc = CreateObjectType<
	typeof BraceFeatures,
	typeof BraceDocBrand,
	{
		/** Which way the tip points, away from the grouped shapes. Omitted = "left". */
		direction?: BraceDirection;
		/**
		 * Where the tip sits along the span, 0..1 from the top for a left/right
		 * brace and from the left for an up/down one. Omitted = 0.5.
		 */
		tipPosition?: number;
	}
>;

export const BRACE_DOC_DEFAULTS: Omit<BraceDoc, "id"> = {
	type: "brace",
	x: 0,
	y: 0,
	width: 24,
	height: 160,
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	direction: BRACE_DIRECTION_DEFAULT,
	tipPosition: BRACE_TIP_POSITION_DEFAULT,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as BraceDoc;

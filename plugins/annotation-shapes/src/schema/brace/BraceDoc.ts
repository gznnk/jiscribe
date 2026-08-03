import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@workspace/canvas/unstable-doc";

import type {
	GroupMarkerDirectionField,
	GroupMarkerTipPositionField,
} from "../shared/GroupMarkerFields";
import {
	GROUP_MARKER_DIRECTION_DEFAULT,
	GROUP_MARKER_TIP_POSITION_DEFAULT,
} from "../shared/GroupMarkerFields";

/**
 * A curly brace used to mark a run of shapes as one group and name it.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering, so
 * transforms and selection work with the same mechanism as Rect. The box is the
 * bracket alone: its short side is the depth the curve bulges by, its long side
 * the span the arms cover. The label is *not* in the box — it is sized from its
 * own text and hung off the tip (calcGroupMarkerTextRegion), so naming the group
 * never competes with the bracket for room.
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BraceDocBrand: unique symbol;

export type BraceDoc = CreateObjectType<
	typeof BraceFeatures,
	typeof BraceDocBrand,
	GroupMarkerDirectionField & GroupMarkerTipPositionField
>;

export const BRACE_DOC_DEFAULTS: Omit<BraceDoc, "id"> = {
	type: "brace",
	x: 0,
	y: 0,
	width: 24,
	height: 160,
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	direction: GROUP_MARKER_DIRECTION_DEFAULT,
	tipPosition: GROUP_MARKER_TIP_POSITION_DEFAULT,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as BraceDoc;

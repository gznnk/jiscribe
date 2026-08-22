import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

import type {
	GroupMarkerDirectionField,
	GroupMarkerTipPositionField,
} from "../shared/GroupMarkerFields";
import {
	GROUP_MARKER_DIRECTION_DEFAULT,
	GROUP_MARKER_TIP_POSITION_DEFAULT,
} from "../shared/GroupMarkerFields";

/**
 * A square bracket with a stem: the bracket of BracketDoc with its spine moved
 * inside the box, plus one straight stem running from the spine out to the
 * outer edge. The stem's end is the tip, so `tipPosition` moves both the stem
 * and the label that hangs off it — which is what lets the marker name a group
 * *and* point at a place in it.
 *
 * Same rect geometry and same band-shaped box as the other markers; like them it
 * carries no fill, its path being open.
 */
export const BracketWithStemFeatures = {
	type: "bracketWithStem",
	geometry: "rect",
	transform: true,
	stroke: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BracketWithStemDocBrand: unique symbol;

export type BracketWithStemDoc = CreateObjectType<
	typeof BracketWithStemFeatures,
	typeof BracketWithStemDocBrand,
	GroupMarkerDirectionField & GroupMarkerTipPositionField
>;

export const BRACKET_WITH_STEM_DOC_DEFAULTS: Omit<BracketWithStemDoc, "id"> = {
	type: "bracketWithStem",
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
} as const as BracketWithStemDoc;

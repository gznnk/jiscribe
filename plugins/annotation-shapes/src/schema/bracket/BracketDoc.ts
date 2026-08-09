import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@jiscribe/canvas-sdk/doc";

import type { GroupMarkerDirectionField } from "../shared/GroupMarkerFields";
import { GROUP_MARKER_DIRECTION_DEFAULT } from "../shared/GroupMarkerFields";

/**
 * A square bracket used to mark a run of shapes as one group and name it.
 *
 * Same rect geometry and same band-shaped box as the brace: the short side is
 * how far the end feet reach, the long side the span the spine runs along. What
 * it drops is the tip — the spine is the outer edge itself, with nothing
 * singling out a place along it — so it carries no `tipPosition` and its label
 * always hangs off the middle of the spine. Reach for BracketWithStemDoc when
 * the label should point at one particular place in the run.
 *
 * The bracket carries no fill: the path is open, so a fill would paint the
 * region between the feet rather than the shape.
 */
export const BracketFeatures = {
	type: "bracket",
	geometry: "rect",
	transform: true,
	stroke: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const BracketDocBrand: unique symbol;

export type BracketDoc = CreateObjectType<
	typeof BracketFeatures,
	typeof BracketDocBrand,
	GroupMarkerDirectionField
>;

export const BRACKET_DOC_DEFAULTS: Omit<BracketDoc, "id"> = {
	type: "bracket",
	x: 0,
	y: 0,
	width: 24,
	height: 160,
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	direction: GROUP_MARKER_DIRECTION_DEFAULT,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as BracketDoc;

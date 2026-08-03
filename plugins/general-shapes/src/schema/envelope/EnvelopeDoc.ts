import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@workspace/canvas/unstable-doc";

/**
 * A closed envelope, used for a single message or event.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is drawn as a label below the box, auto-sized to the text itself, so it stays readable at any box size.
 */
export const EnvelopeFeatures = {
	type: "envelope",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Corner radius as a fraction of the shorter side. Shared by the silhouette, the
 * outline (which rounds the same corners the drawing does) and the flap, which
 * creases from the 45° point of each top corner arc so it meets the body's own
 * corner rather than the box's.
 */
export const ENVELOPE_CORNER_RATIO = 0.05;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const EnvelopeDocBrand: unique symbol;

export type EnvelopeDoc = CreateObjectType<
	typeof EnvelopeFeatures,
	typeof EnvelopeDocBrand
>;

export const ENVELOPE_DOC_DEFAULTS: Omit<EnvelopeDoc, "id"> = {
	type: "envelope",
	x: 0,
	y: 0,
	width: 120,
	height: 84,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as EnvelopeDoc;

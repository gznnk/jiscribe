import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@jiscribe/canvas-sdk/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/**
 * An actor (stick figure) used for users / roles in use-case diagrams and for
 * stakeholders in organizational or business diagrams.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * stick figure with a full-box transparent hit area (thin limbs alone would be
 * hard to grab). This lets it reuse Frame-based transforms and connector
 * outline connections with the same mechanism as Rect. The figure fills the
 * whole box; the label is sized from its own text and hung below the box
 * (calcBelowLabelTextRegion), so it stays legible however small the box gets.
 */
export const ActorFeatures = {
	type: "actor",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ActorDocBrand: unique symbol;

export type ActorDoc = CreateObjectType<
	typeof ActorFeatures,
	typeof ActorDocBrand
>;

export const ACTOR_DOC_DEFAULTS: Omit<ActorDoc, "id"> = {
	type: "actor",
	x: 0,
	y: 0,
	width: 80,
	height: 100,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as ActorDoc;

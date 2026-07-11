import { DEFAULT_FONT_FAMILY } from "../../../../constants/defaultFontFamily";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";

/**
 * Height of the stick figure as a fraction of the height; the band below it
 * holds the label. Shared by the renderer (figure layout) and the text region
 * inset so the figure and the label band can never drift apart.
 */
export const ACTOR_FIGURE_RATIO = 0.72;

/**
 * An actor (stick figure) used for users / roles in use-case diagrams and for
 * stakeholders in organizational or business diagrams.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * stick figure with a full-bbox transparent hit area (thin limbs alone would be
 * hard to grab). This lets it reuse Frame-based transforms and connector
 * outline connections with the same mechanism as Rect. The text region is the
 * label band below the figure.
 */
export const ActorFeatures = {
	type: "actor",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	connectable: true,
	textRegion: { unit: "ratio", inset: { top: ACTOR_FIGURE_RATIO } },
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
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 14,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as ActorDoc;

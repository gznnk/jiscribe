import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@workspace/canvas/unstable-doc";

/**
 * A server rack (a box divided into stacked units, each with a status light), used for hosts, nodes and running processes in architecture diagrams.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is drawn as a label below the box, auto-sized to the text itself, so it stays readable at any box size.
 */
export const ServerFeatures = {
	type: "server",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ServerDocBrand: unique symbol;

export type ServerDoc = CreateObjectType<
	typeof ServerFeatures,
	typeof ServerDocBrand
>;

export const SERVER_DOC_DEFAULTS: Omit<ServerDoc, "id"> = {
	type: "server",
	x: 0,
	y: 0,
	width: 90,
	height: 110,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as ServerDoc;

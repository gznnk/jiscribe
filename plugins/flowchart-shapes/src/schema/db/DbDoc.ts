import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";

/**
 * Height ratio of the cylinder cap ellipse (ry / height).
 * Shared by the renderer (cap drawing) and the text region inset so the
 * visible cap and the text region can never drift apart.
 */
export const DB_CAP_RATIO = 0.12;

/**
 * A database cylinder used for data stores in architecture / flow diagrams.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * cylinder. This lets it reuse Frame-based transforms and connector outline
 * connections with the same mechanism as Rect.
 */
export const DbFeatures = {
	type: "db",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DbDocBrand: unique symbol;

export type DbDoc = CreateObjectType<typeof DbFeatures, typeof DbDocBrand>;

export const DB_DOC_DEFAULTS: Omit<DbDoc, "id"> = {
	type: "db",
	x: 0,
	y: 0,
	width: 120,
	height: 100,
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
} as const as DbDoc;

import { DEFAULT_FONT_FAMILY } from "../../../../constants/defaultFontFamily";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { AUTO_COLOR } from "../../utils/autoColor";

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
 * connections with the same mechanism as Rect. Unlike bbox-text shapes, the
 * text region is declared via `textRegion` to cover only the body below the
 * cap ellipse (the cap's lower edge sits at 2 * DB_CAP_RATIO of the height).
 */
export const DbFeatures = {
	type: "db",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: true,
	connectable: true,
	textRegion: { unit: "ratio", inset: { top: DB_CAP_RATIO * 2 } },
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
	textType: "text",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as DbDoc;

import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@workspace/canvas-sdk/doc";

/** Width of each inner vertical bar as a fraction of the width (shared by renderer and text region). */
export const SUBROUTINE_BAR_RATIO = 0.12;

/**
 * A predefined-process (subroutine) box: a rectangle with a vertical bar near each side, used for calls to a defined sub-procedure.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect.
 */
export const SubroutineFeatures = {
	type: "subroutine",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SubroutineDocBrand: unique symbol;

export type SubroutineDoc = CreateObjectType<
	typeof SubroutineFeatures,
	typeof SubroutineDocBrand
>;

export const SUBROUTINE_DOC_DEFAULTS: Omit<SubroutineDoc, "id"> = {
	type: "subroutine",
	x: 0,
	y: 0,
	width: 140,
	height: 80,
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
} as const as SubroutineDoc;

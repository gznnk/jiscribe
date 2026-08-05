import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import { DEFAULT_FONT_FAMILY, AUTO_COLOR } from "@workspace/canvas-sdk/doc";

/**
 * Height of the downward tip as a fraction of the height.
 * Shared by the renderer (point calculation) and the text region inset so the
 * visible tip and the text region can never drift apart.
 */
export const OFF_PAGE_CONNECTOR_TIP_RATIO = 0.3;

/**
 * A home-plate pentagon (rectangle tapering to a downward point), used as the
 * off-page connector in flowcharts — a labelled jump to another page/section.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering for a
 * pentagon polygon. This lets it reuse Frame-based transforms and connector
 * outline connections with the same mechanism as Rect.
 */
export const OffPageConnectorFeatures = {
	type: "offPageConnector",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const OffPageConnectorDocBrand: unique symbol;

export type OffPageConnectorDoc = CreateObjectType<
	typeof OffPageConnectorFeatures,
	typeof OffPageConnectorDocBrand
>;

export const OFF_PAGE_CONNECTOR_DOC_DEFAULTS: Omit<OffPageConnectorDoc, "id"> =
	{
		type: "offPageConnector",
		x: 0,
		y: 0,
		width: 120,
		height: 90,
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
	} as const as OffPageConnectorDoc;

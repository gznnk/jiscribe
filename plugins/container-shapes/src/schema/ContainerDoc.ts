import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";
import type {
	CreateObjectType,
	ExtraStylePropertyDescriptor,
	ObjectFeatures,
} from "@jiscribe/doc";

/** Default height of the title header band, in local (pre-transform) pixels. */
export const CONTAINER_HEADER_HEIGHT = 28;

/** Lower clamp for interactive header-height resizing. */
export const CONTAINER_MIN_HEADER_HEIGHT = 16;

/**
 * A container ("frame"): a titled rectangle that labels/encloses a region of a
 * diagram (module, subsystem, boundary). The title lives in a top header band;
 * the body is click-through so objects placed inside stay directly selectable
 * (see ContainerStyled / calcContainerTextRegion). Move-together is not built
 * in — it is the existing `group` primitive, used orthogonally.
 *
 * Adopts rect geometry (x/y/width/height) so it reuses Frame-based transforms
 * and outline connector attachment exactly like Rect / Card.
 */
export const ContainerFeatures = {
	type: "container",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/** Container-specific styleable properties beyond the ObjectFeatures flags (see ExtraStylePropertyRegistry). */
export const ContainerExtraStyleProperties = {
	headerFill: { valueType: "string" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ContainerDocBrand: unique symbol;

export type ContainerDoc = CreateObjectType<
	typeof ContainerFeatures,
	typeof ContainerDocBrand,
	{
		/** Header band fill, independent of `fill` (the body). Default `"auto"` = theme surface. */
		headerFill?: string;
		/** Header band height in local pixels. Default CONTAINER_HEADER_HEIGHT. */
		headerHeight?: number;
	}
>;

/** Theme-derived doc defaults for a newly created container (tier 2: AUTO_COLOR / DEFAULT_FONT_FAMILY). */
export const CONTAINER_DOC_DEFAULTS: Omit<ContainerDoc, "id"> = {
	type: "container",
	x: 0,
	y: 0,
	width: 240,
	height: 160,
	fill: "transparent",
	headerFill: AUTO_COLOR,
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textAlign: "left",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 14,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "bold",
} as const as ContainerDoc;

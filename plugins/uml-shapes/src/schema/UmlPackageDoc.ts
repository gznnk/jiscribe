import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";

/** Type size the name is drawn at, shared with the record so the two read alike. */
export const UML_PACKAGE_FONT_SIZE = 14;

/** Tab width as a fraction of the box width, the proportion UML drawings use. */
export const UML_PACKAGE_TAB_WIDTH_RATIO = 0.4;

/**
 * Tab height in local pixels on a box tall enough for it. Fixed rather than a
 * fraction of the height: the tab is a label holder, so it stays the same size
 * as the box grows, exactly as the name's type size does.
 */
export const UML_PACKAGE_TAB_HEIGHT = 16;

/**
 * Largest share of the box height the tab may take. Only binds below 64px of
 * height, where the fixed tab would leave too little body for the name.
 */
export const UML_PACKAGE_TAB_MAX_HEIGHT_RATIO = 0.25;

/**
 * Height of the tab on a box `height` tall. The single place the clamp lives: the
 * silhouette, the outline and the text region all measure the tab with it, so the
 * drawing and the region the name is laid out in cannot drift apart.
 *
 * @param height - Box height in local pixels, tab included; 0 or less yields 0, i.e. no tab
 * @returns Local pixels, never more than {@link UML_PACKAGE_TAB_HEIGHT}
 */
export const calcUmlPackageTabHeight = (height: number): number =>
	Math.max(
		0,
		Math.min(UML_PACKAGE_TAB_HEIGHT, height * UML_PACKAGE_TAB_MAX_HEIGHT_RATIO),
	);

/**
 * A UML package: a rectangle with a tab on its top-left corner, holding the name
 * in the body below the tab.
 *
 * Adopts rect geometry (x/y/width/height), the rect being the outer bounds of the
 * whole silhouette (tab included), so it reuses Frame-based transforms and
 * outline connector attachment exactly like Rect / Card.
 */
export const UmlPackageFeatures = {
	type: "umlPackage",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const UmlPackageDocBrand: unique symbol;

export type UmlPackageDoc = CreateObjectType<
	typeof UmlPackageFeatures,
	typeof UmlPackageDocBrand
>;

/**
 * Theme-derived doc defaults for a newly created package (tier 2: AUTO_COLOR /
 * DEFAULT_FONT_FAMILY). The typography matches the record's name band — bold and
 * centered, as UML draws the name of a namespace — and the height leaves the body
 * below the 16px tab roughly as tall as a record's title band over one
 * compartment, so the two shapes balance side by side.
 */
export const UML_PACKAGE_DOC_DEFAULTS: Omit<UmlPackageDoc, "id"> = {
	type: "umlPackage",
	x: 0,
	y: 0,
	width: 160,
	height: 108,
	fill: AUTO_COLOR,
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: UML_PACKAGE_FONT_SIZE,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "bold",
} as const as UmlPackageDoc;

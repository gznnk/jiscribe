import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";

/** Type size the name is drawn at, shared with the record so the two read alike. */
export const UML_COMPONENT_FONT_SIZE = 14;

/**
 * Icon geometry, in local pixels. The whole mark is a fixed size — it is a
 * notation symbol rather than a part of the box — so a wider component keeps the
 * same icon in its top-right corner, and only a box narrower than about 40px
 * cannot hold one.
 */

/** Gap between the icon and the box's top and right edges. */
export const UML_COMPONENT_ICON_INSET = 8;

/** Width of the icon's body, tabs excluded. */
export const UML_COMPONENT_ICON_WIDTH = 16;

/** Height of the icon's body, which the tabs stay inside. */
export const UML_COMPONENT_ICON_HEIGHT = 20;

/**
 * Width of one tab. It straddles the icon body's left edge, so only
 * {@link UML_COMPONENT_ICON_TAB_OVERHANG} of it is outside the body and the rest
 * lies over it.
 */
export const UML_COMPONENT_ICON_TAB_WIDTH = 12;

/** How far a tab sticks out to the left of the icon body. */
export const UML_COMPONENT_ICON_TAB_OVERHANG = 6;

/** Height of one tab. */
export const UML_COMPONENT_ICON_TAB_HEIGHT = 5;

/** Gap between the icon's top edge and the upper tab; the lower tab leaves the same gap at the bottom. */
export const UML_COMPONENT_ICON_TAB_INSET = 3;

/** Vertical gap between the two tabs, wide enough that they never read as one. */
export const UML_COMPONENT_ICON_TAB_GAP = 4;

/**
 * A UML 2 component: a rectangle carrying the component icon in its top-right
 * corner, with the name centered in the box.
 *
 * Adopts rect geometry (x/y/width/height) and only swaps the rendering, so it
 * reuses Frame-based transforms and outline connector attachment exactly like
 * Rect / Card. The icon is drawn inside the box, so the rect is the whole
 * silhouette.
 */
export const UmlComponentFeatures = {
	type: "umlComponent",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const UmlComponentDocBrand: unique symbol;

export type UmlComponentDoc = CreateObjectType<
	typeof UmlComponentFeatures,
	typeof UmlComponentDocBrand
>;

/**
 * Theme-derived doc defaults for a newly created component (tier 2: AUTO_COLOR /
 * DEFAULT_FONT_FAMILY). The typography matches the record's name band — bold and
 * centered, as UML draws a type name — and the default box is wide enough that a
 * centered name clears the icon in the top-right corner.
 */
export const UML_COMPONENT_DOC_DEFAULTS: Omit<UmlComponentDoc, "id"> = {
	type: "umlComponent",
	x: 0,
	y: 0,
	width: 160,
	height: 90,
	fill: AUTO_COLOR,
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: UML_COMPONENT_FONT_SIZE,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "bold",
} as const as UmlComponentDoc;

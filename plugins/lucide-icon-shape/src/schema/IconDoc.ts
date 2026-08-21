import { AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";
import type {
	CreateObjectType,
	ExtraStylePropertyDescriptor,
	ObjectFeatures,
} from "@jiscribe/doc";

/** Side of the grid the icon drawings are authored on, and so the box a scale of 1 fills. */
export const ICON_GRID_SIZE = 24;

/** Icon drawn when a shape is created without naming one. */
export const DEFAULT_ICON_NAME = "star";

/**
 * A named pictogram from the bundled Lucide set, drawn as line art at whatever size
 * the box gives it.
 *
 * The type is named after the set rather than after pictograms in general, so a shape
 * backed by another set can be added beside it without either having to give up the
 * obvious name.
 *
 * Decoration rather than a node: it carries no text and cannot be a connector
 * endpoint, so an arrow attaches to the shape the icon sits beside instead of to the
 * icon. A diagram that wants a picture to *be* a node reaches for a labelled
 * pictogram (`server`, `package`, `database`) instead.
 *
 * Adopts rect geometry (x/y/width/height) so it reuses Frame-based transforms; the
 * drawing is scaled uniformly and centred, so a non-square box leaves margin rather
 * than stretching the icon.
 */
export const IconFeatures = {
	type: "lucideIcon",
	geometry: "rect",
	transform: true,
	stroke: true,
} as const satisfies ObjectFeatures;

/** Icon-specific styleable properties beyond the ObjectFeatures flags (see ExtraStylePropertyRegistry). */
export const IconExtraStyleProperties = {
	icon: { valueType: "string" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const IconDocBrand: unique symbol;

export type IconDoc = CreateObjectType<
	typeof IconFeatures,
	typeof IconDocBrand,
	{
		/**
		 * Which icon to draw, as a name of the bundled set. A superseded name
		 * (`user-circle`) or another spelling (`fileText`) resolves to the current
		 * one; a name that resolves to nothing is a validation error carrying
		 * suggestions. Omitted = DEFAULT_ICON_NAME.
		 */
		icon?: string;
	}
>;

export const ICON_DOC_DEFAULTS: Omit<IconDoc, "id"> = {
	type: "lucideIcon",
	x: 0,
	y: 0,
	width: 64,
	height: 64,
	icon: DEFAULT_ICON_NAME,
	// The drawing is square and stays square, so a box that is not leaves dead margin
	// rather than a bigger icon. Locking by default keeps a resize doing the one thing
	// it can do here; the menu's lock is still there to be turned off deliberately.
	lockAspectRatio: true,
	stroke: AUTO_COLOR,
	// The icon set draws at this width on its own grid, and the renderer keeps it
	// visually constant regardless of how far the grid is scaled.
	strokeWidth: 2,
} as const as IconDoc;

import type { CreateObjectType, ObjectFeatures } from "@jiscribe/canvas/doc";
import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";

/**
 * A comment box with its top-right corner folded back — the UML note.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the drawing, so it
 * reuses Frame-based transforms and connector outline attachment by the same
 * mechanism as Rect. Unlike the group markers in this package the text goes
 * inside the box, which is what the shape is for: a landscape box holding a
 * sentence or two of prose about the diagram.
 */
export const NoteFeatures = {
	type: "note",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * The folded corner's leg length, as a fraction of the shorter side
 * (calcNoteFoldSize). One ratio rather than the file pictogram's separate width
 * and height ratios: the note is a text box, so the fold has to stay a small
 * dog-ear at any aspect ratio instead of scaling with the box.
 */
export const NOTE_FOLD_RATIO = 0.2;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const NoteDocBrand: unique symbol;

export type NoteDoc = CreateObjectType<
	typeof NoteFeatures,
	typeof NoteDocBrand
>;

export const NOTE_DOC_DEFAULTS: Omit<NoteDoc, "id"> = {
	type: "note",
	x: 0,
	y: 0,
	width: 180,
	height: 110,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	// Prose reads from the top left, and a left-aligned block also hides the gap
	// the fold leaves on the right (calcNoteTextRegion).
	textAlign: "left",
	verticalAlign: "top",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as NoteDoc;

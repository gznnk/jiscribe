import { DocOperationError } from "./errors";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import {
	isViewOpenMode,
	isViewScrollMode,
	type ViewDoc,
	type ViewOpenMode,
	type ViewPaddingDoc,
	type ViewScrollMode,
} from "../model/canvas/ViewDoc";

/**
 * Set or clear the canvas surface color, mutating `doc` in place.
 *
 * The color is stored as written, so it has to be a literal CSS color rather than a
 * `var(...)`: the file travels between hosts that do not share a theme, and a variable
 * would resolve differently — or not at all — in each of them. Clearing the field is
 * what puts the surface back under the host theme, which is not the same as painting it
 * white.
 *
 * @param doc - Mutated in place
 * @param color - A literal CSS color (`"#fafafa"`, `"rgb(250 250 250)"`), or null to drop
 *   the field so the surface follows the host theme again
 * @throws {@link DocOperationError} when the color is an empty or blank string, which
 *   would otherwise be written as a surface no host can paint
 */
export const setBackground = (doc: CanvasDoc, color: string | null): void => {
	if (color === null) {
		delete doc.background;
		return;
	}
	if (color.trim() === "") {
		throw new DocOperationError(
			"background must be a CSS color; pass null to clear it and follow the theme instead",
		);
	}
	doc.background = color;
};

/**
 * Every side of {@link ViewPaddingDoc}, written as a map so that a side added to the
 * type fails to compile until it is entered here. A plain array would leave a new side
 * silently unread — never validated, never stored.
 */
const PADDING_SIDE_MARKERS: Readonly<Record<keyof ViewPaddingDoc, true>> = {
	top: true,
	right: true,
	bottom: true,
	left: true,
};

/** The sides {@link setView} reads, in the order messages list them. */
const PADDING_SIDES = Object.keys(
	PADDING_SIDE_MARKERS,
) as (keyof ViewPaddingDoc)[];

/**
 * What {@link setView} writes. A field left out keeps whatever the document
 * already declares; a field given as null drops that declaration.
 */
export type SetViewParams = {
	/** Empty space kept outside the content, or null to declare none. */
	padding?: ViewPaddingDoc | null;
	/** How the view is framed on open, or null to leave it to the host. */
	open?: ViewOpenMode | null;
	/** Whether panning is walled in at the padded content, or null for the endless board. */
	scroll?: ViewScrollMode | null;
};

/**
 * Reads back the sides worth storing, dropping the ones that are zero.
 *
 * A side of 0 is what an omitted side already means, so writing it would only make
 * the declaration longer without changing what any host does with it.
 *
 * @param padding - The requested padding; every side optional
 * @returns The sides to store, or null when none of them says anything
 * @throws {@link DocOperationError} for a side that is negative or not finite
 */
const takeMeaningfulPadding = (
	padding: ViewPaddingDoc,
): ViewPaddingDoc | null => {
	const stored: ViewPaddingDoc = {};
	for (const side of PADDING_SIDES) {
		const value = padding[side];
		if (value === undefined) {
			continue;
		}
		if (!Number.isFinite(value) || value < 0) {
			throw new DocOperationError(
				`view padding ${side} must be a number of 0 or more, but got ${String(value)}`,
			);
		}
		if (value > 0) {
			stored[side] = value;
		}
	}
	return Object.keys(stored).length === 0 ? null : stored;
};

/**
 * Write the document's display declaration — the empty space around the drawing, how
 * the view is framed when it opens, and whether panning is walled in — mutating `doc`
 * in place.
 *
 * The three parts are independent: pass only the ones to change. Passing null for a
 * part removes that declaration, which hands the decision back to whatever host opens
 * the document; the whole `view` field goes away once no part is left, so a document
 * that declares nothing carries nothing.
 *
 * This is presentation only. The padding is not a boundary — objects may sit outside
 * it and editing is not constrained by it — and `open` / `scroll` are intents a host
 * setting its own camera or scroll limit outranks.
 *
 * @param doc - Mutated in place
 * @param params - The parts to write; every part optional, null to drop that part
 * @returns The declaration as it now stands, or null once nothing is declared. Read it
 *   rather than echoing `params`: a padding of all zeroes declares nothing, so what was
 *   asked for and what the document ends up saying are not always the same
 * @throws {@link DocOperationError} when no part is given at all, when a padding side
 *   is negative or not finite, or when a mode is not one the document can hold
 */
export const setView = (
	doc: CanvasDoc,
	params: SetViewParams,
): ViewDoc | null => {
	if (
		params.padding === undefined &&
		params.open === undefined &&
		params.scroll === undefined
	) {
		throw new DocOperationError(
			"nothing to declare: give at least one of padding / open / scroll, or null to drop one",
		);
	}
	if (params.open != null && !isViewOpenMode(params.open)) {
		throw new DocOperationError(
			`view open must be "fit-width" or "fit-all", but got ${String(params.open)}`,
		);
	}
	if (params.scroll != null && !isViewScrollMode(params.scroll)) {
		throw new DocOperationError(
			`view scroll must be "content" or "infinite", but got ${String(params.scroll)}`,
		);
	}

	// Validate before writing anything, so a throw partway through leaves the doc as it was.
	const nextView: ViewDoc = { ...doc.view };
	if (params.padding !== undefined) {
		const stored =
			params.padding === null ? null : takeMeaningfulPadding(params.padding);
		if (stored === null) {
			delete nextView.padding;
		} else {
			nextView.padding = stored;
		}
	}
	if (params.open !== undefined) {
		if (params.open === null) {
			delete nextView.open;
		} else {
			nextView.open = params.open;
		}
	}
	if (params.scroll !== undefined) {
		if (params.scroll === null) {
			delete nextView.scroll;
		} else {
			nextView.scroll = params.scroll;
		}
	}

	if (Object.keys(nextView).length === 0) {
		delete doc.view;
		return null;
	}
	doc.view = nextView;
	return nextView;
};

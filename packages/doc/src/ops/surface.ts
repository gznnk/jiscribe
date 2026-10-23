import { DocOperationError } from "./errors";
import { requireObject } from "./utils/objectAccess";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import { mergeViewDoc, type ViewParams } from "../model/canvas/mergeViewDoc";
import {
	isViewOpenMode,
	isViewScrollMode,
	VIEW_PADDING_KEYS,
	type ViewDoc,
	type ViewPaddingDoc,
} from "../model/canvas/ViewDoc";
import type { MetaDoc } from "../model/objects/base/MetaDoc";
import {
	mergeMetaDoc,
	type MetaParams,
} from "../model/objects/utils/mergeMetaDoc";

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
 * What {@link setView} writes. A field left out keeps whatever the document
 * already declares; a field given as null drops that declaration.
 */
export type SetViewParams = ViewParams;

/**
 * Refuses a padding side no host can lay out.
 *
 * @throws {@link DocOperationError} for a side that is negative or not finite
 */
const assertValidPadding = (padding: ViewPaddingDoc): void => {
	for (const side of VIEW_PADDING_KEYS) {
		const value = padding[side];
		if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
			throw new DocOperationError(
				`view padding ${side} must be a number of 0 or more, but got ${String(value)}`,
			);
		}
	}
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
	if (params.padding != null) {
		assertValidPadding(params.padding);
	}

	const nextView = mergeViewDoc(doc.view, params);
	if (nextView === undefined) {
		delete doc.view;
		return null;
	}
	doc.view = nextView;
	return nextView;
};

/**
 * What {@link setMeta} writes, and to whom. A field left out keeps whatever the note
 * already states; a field given as null — or as the empty string — drops it.
 */
export type SetMetaParams = MetaParams & {
	/**
	 * Id of the object whose note to write — any object in the tree, group and
	 * connector included. Left out, the document's own note is written instead.
	 */
	id?: string;
};

/**
 * Write a note — a name and description, the `meta` record — on the document itself or
 * on one object, mutating `doc` in place.
 *
 * Only `name` and `description` are written; any other member already there (a
 * `reference`, a host's own keys) is kept. The whole `meta` field goes away once no
 * member is left, so whatever states nothing carries nothing.
 *
 * @param doc - Mutated in place
 * @param params - The fields to write, each optional, null or `""` to drop that field;
 *   `id` picks the object, and leaving it out writes the document's own note
 * @returns The note as it now stands, or null once its owner carries none
 * @throws {@link DocOperationError} when neither field is given, or when `id` names no
 *   object in the tree
 */
export const setMeta = (
	doc: CanvasDoc,
	params: SetMetaParams,
): MetaDoc | null => {
	if (params.name === undefined && params.description === undefined) {
		throw new DocOperationError(
			"nothing to write: give name and / or description, or null to drop one",
		);
	}
	const owner: { meta?: MetaDoc } =
		params.id === undefined ? doc : requireObject(doc, params.id).object;
	const nextMeta = mergeMetaDoc(owner.meta, params);
	if (nextMeta === undefined) {
		delete owner.meta;
		return null;
	}
	owner.meta = nextMeta as MetaDoc;
	return owner.meta;
};

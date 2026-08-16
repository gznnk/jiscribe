import type { Rect } from "@jiscribe/geometry";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import {
	type ObjectRecord,
	requireGroup,
	requireObject,
} from "../utils/objectAccess";
import {
	type DocDefinitions,
	getObjectBounds,
	readChildren,
} from "../utils/objectGeometry";
import { readObjectText } from "../utils/textFields";

/**
 * Read one object as it sits in the document.
 *
 * The document's own object is returned rather than a copy, so a caller can read every
 * field the type declares — style, rotation, points, slots — without an op per property.
 * Nothing here checks a write, which is why the return is `Readonly`: changing what comes
 * back edits the document behind the validation the editing ops do. The readonly only
 * covers the top level, so the arrays underneath (`points`, `children`) are still the
 * document's own; treat the whole of it as read-only and edit through the ops.
 *
 * @param doc - Searched but not modified, group children included
 * @param id - Id to read; unlike a search, a miss is an error rather than a null
 * @returns The object itself, holding whatever fields its type declares
 * @throws {@link DocOperationError} when no object carries the id
 */
export const getObject = (doc: CanvasDoc, id: string): Readonly<ObjectDoc> =>
	requireObject(doc, id).object;

/** What {@link listObjects} reports about one object: enough to decide, without its full doc. */
export type ObjectSummary = {
	/** The object's id. */
	id: string;
	/** Its type name, as `addObject` takes it. */
	type: string;
	/** Its bounding box, or null for a type that cannot be measured. */
	bounds: Rect | null;
	/** The group holding it, or null when it sits at the root. */
	parentId: string | null;
	/** Its text as plain characters, or null for a type that holds none. */
	text: string | null;
};

/** One summary per object, each group followed straight away by what it holds. */
const summarizeObjects = (
	siblings: readonly ObjectRecord[],
	parentId: string | null,
	definitions: DocDefinitions,
): ObjectSummary[] =>
	siblings.flatMap((object) => [
		{
			id: object.id,
			type: object.type,
			bounds: getObjectBounds(object, definitions),
			parentId,
			text: readObjectText(object, definitions),
		},
		...summarizeObjects(readChildren(object), object.id, definitions),
	]);

/**
 * Summarize every object in the document — what a caller reads instead of the whole doc
 * to find out what is on the canvas and where.
 *
 * The list is flat: a group's children follow the group itself rather than nesting inside
 * it, and `parentId` is what the nesting is read back from. Nothing is truncated, a summary
 * being smaller than the doc it stands for by an order of magnitude.
 *
 * @param doc - Searched but not modified
 * @param definitions - Type table `features.geometry` and `features.text` are read from
 * @returns One summary per object, in drawing order: `doc.root` back to front, with each
 *   group's children between it and its next sibling
 */
export const listObjects = (
	doc: CanvasDoc,
	definitions: DocDefinitions,
): ObjectSummary[] =>
	summarizeObjects(doc.root as ObjectRecord[], null, definitions);

/** Which objects {@link findObjects} keeps. Conditions are ANDed; an empty filter keeps everything. */
export type ObjectFilter = {
	/** Keep only these types; omitted keeps every type. */
	type?: string | readonly string[];
	/** Keep objects whose text contains this, matched case-insensitively. */
	text?: string;
	/** Keep objects whose bounding box sits entirely inside this rect. */
	within?: Rect;
	/** Keep only the direct children of this group. */
	inGroup?: string;
};

/** Whether `inner` lies wholly within `outer`, edges touching included. */
const isRectWithin = (inner: Rect, outer: Rect): boolean =>
	inner.x >= outer.x &&
	inner.y >= outer.y &&
	inner.x + inner.width <= outer.x + outer.width &&
	inner.y + inner.height <= outer.y + outer.height;

/** Whether one summary satisfies every condition the filter sets. */
const matchesFilter = (
	summary: ObjectSummary,
	filter: ObjectFilter,
	types: ReadonlySet<string> | undefined,
	lowercaseText: string | undefined,
): boolean => {
	if (types !== undefined && !types.has(summary.type)) {
		return false;
	}
	if (
		lowercaseText !== undefined &&
		(summary.text === null ||
			!summary.text.toLowerCase().includes(lowercaseText))
	) {
		return false;
	}
	if (
		filter.within !== undefined &&
		(summary.bounds === null || !isRectWithin(summary.bounds, filter.within))
	) {
		return false;
	}
	return filter.inGroup === undefined || summary.parentId === filter.inGroup;
};

/**
 * The objects matching a filter, summarized as {@link listObjects} summarizes them.
 *
 * Every condition given must hold, so naming two of them narrows rather than widens, and a
 * filter setting none is {@link listObjects} itself. An object that cannot answer a
 * condition fails it: one with no text never matches `text`, and one with no bounding box
 * (a connector, an empty group) never matches `within`.
 *
 * @param doc - Searched but not modified
 * @param filter - The conditions to meet. `within` keeps only what sits **entirely** inside
 *   the rect, edges touching included — it is containment and not intersection, so a shape
 *   straddling the edge is left out. `text` is matched as a substring, case-insensitively,
 *   against the same characters `getText` returns. `inGroup` keeps the group's direct
 *   children only, its grandchildren being children of the group between
 * @param definitions - Type table `features.geometry` and `features.text` are read from
 * @returns The matching summaries, in the drawing order {@link listObjects} lists them in;
 *   empty when nothing matches
 * @throws {@link DocOperationError} when `inGroup` names an id the document does not hold,
 *   or one that is not a group
 */
export const findObjects = (
	doc: CanvasDoc,
	filter: ObjectFilter,
	definitions: DocDefinitions,
): ObjectSummary[] => {
	if (filter.inGroup !== undefined) {
		// Rejected here rather than yielding nothing: an id that names no group would read
		// back as an empty group, which hides the caller's mistake instead of naming it.
		requireGroup(doc, filter.inGroup);
	}
	const types =
		filter.type === undefined
			? undefined
			: new Set(typeof filter.type === "string" ? [filter.type] : filter.type);
	const lowercaseText = filter.text?.toLowerCase();
	return listObjects(doc, definitions).filter((summary) =>
		matchesFilter(summary, filter, types, lowercaseText),
	);
};

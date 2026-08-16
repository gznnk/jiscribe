import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import { GroupFeatures } from "../../schemas/objects/primitives/group/GroupDoc";
import { DocOperationError } from "../errors";

/**
 * A doc object seen as a plain record. The doc-ops read and write fields that only
 * some types declare (`x`, `points`, `children`, …), so they work through this rather
 * than through the branded per-type docs.
 */
export type ObjectRecord = ObjectDoc & Record<string, unknown>;

/** Where an object sits in the tree, so an op can splice or replace it. */
export type ObjectLocation = {
	object: ObjectRecord;
	/** The array holding it: `doc.root`, or a group's `children`. */
	siblings: ObjectDoc[];
	/** Index within `siblings`; invalidated by any splice of that array. */
	index: number;
};

/**
 * Locate an object by id, recursing into group children.
 *
 * @param doc - Searched but not modified
 * @param id - Id to look for; ids are unique across the whole root tree (ids.ts)
 * @returns The object with its parent array and index, or undefined when no id matches
 */
export const findObject = (
	doc: CanvasDoc,
	id: string,
): ObjectLocation | undefined => {
	const visit = (siblings: ObjectDoc[]): ObjectLocation | undefined => {
		for (const [index, object] of siblings.entries()) {
			if (object.id === id) {
				return { object: object as ObjectRecord, siblings, index };
			}
			const children = (object as ObjectRecord).children;
			if (Array.isArray(children)) {
				const found = visit(children as ObjectDoc[]);
				if (found !== undefined) {
					return found;
				}
			}
		}
		return undefined;
	};
	return visit(doc.root);
};

/**
 * {@link findObject} that fails instead of returning undefined.
 *
 * @param doc - Searched but not modified
 * @param id - Id to look for
 * @returns The located object
 * @throws {@link DocOperationError} when no object carries the id
 */
export const requireObject = (doc: CanvasDoc, id: string): ObjectLocation => {
	const found = findObject(doc, id);
	if (found === undefined) {
		throw new DocOperationError(`object not found: ${id}`);
	}
	return found;
};

/**
 * Locate every id in one pass, so a bulk op can reject a bad id before it mutates anything.
 *
 * @param doc - Searched but not modified
 * @param ids - Ids to look for; duplicates yield duplicate entries
 * @returns The locations in the order the ids were given
 * @throws {@link DocOperationError} naming every id that was not found
 */
export const requireObjects = (
	doc: CanvasDoc,
	ids: readonly string[],
): ObjectLocation[] => {
	const located = ids.map((id) => ({ id, location: findObject(doc, id) }));
	const missingIds = located
		.filter(({ location }) => location === undefined)
		.map(({ id }) => id);
	if (missingIds.length > 0) {
		throw new DocOperationError(`object not found: ${missingIds.join(", ")}`);
	}
	return located.map(({ location }) => location as ObjectLocation);
};

/** Read `id` as a group, failing when it is something else, with its children to hand. */
export const requireGroup = (
	doc: CanvasDoc,
	id: string,
): ObjectLocation & { children: ObjectDoc[] } => {
	const location = requireObject(doc, id);
	const { object } = location;
	if (object.type !== GroupFeatures.type || !Array.isArray(object.children)) {
		throw new DocOperationError(`${id} is "${object.type}", not a group`);
	}
	return { ...location, children: object.children as ObjectDoc[] };
};

/** Ids of `object` and of every descendant reachable through group children. */
export const collectObjectIds = (object: ObjectDoc): string[] => {
	const ids = [object.id];
	const children = (object as ObjectRecord).children;
	if (Array.isArray(children)) {
		for (const child of children as ObjectDoc[]) {
			ids.push(...collectObjectIds(child));
		}
	}
	return ids;
};

/**
 * Remove every group left without children, which has no frame of its own to draw.
 * Children are visited before their parent, so a group emptied by losing its last
 * child group goes in the same pass.
 *
 * @param doc - Mutated in place
 * @returns The ids removed, innermost first; empty when every group still holds something
 */
export const dropEmptyGroups = (doc: CanvasDoc): string[] => {
	const droppedIds: string[] = [];
	const visit = (siblings: ObjectDoc[]): void => {
		// Back to front so a removal leaves the indexes still to visit untouched.
		for (let index = siblings.length - 1; index >= 0; index -= 1) {
			const children = (siblings[index] as ObjectRecord).children;
			if (!Array.isArray(children)) {
				continue;
			}
			visit(children as ObjectDoc[]);
			if (children.length === 0) {
				droppedIds.push(siblings[index].id);
				siblings.splice(index, 1);
			}
		}
	};
	visit(doc.root);
	return droppedIds;
};

/** Reject the ids the caller may not touch, with one message listing all of them. */
export const rejectIds = (
	ids: readonly string[],
	reason: string,
): void | never => {
	if (ids.length > 0) {
		throw new DocOperationError(`${ids.join(", ")}: ${reason}`);
	}
};

import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import { GroupFeatures } from "../../model/objects/primitives/group/GroupDoc";
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
 * The children of a group, or `[]` for any other object. Only a group's are walked: an
 * object of a type the definitions do not know is held as it is (`OpaqueObjectDoc`), so a
 * `children` array it may carry is part of what it holds rather than objects of the doc.
 */
export const readChildren = (object: ObjectDoc): ObjectRecord[] => {
	const children = (object as ObjectRecord).children;
	return object.type === GroupFeatures.type && Array.isArray(children)
		? (children as ObjectRecord[])
		: [];
};

/**
 * Locate several ids in one walk of the tree, for an op that looks up many objects and
 * would otherwise walk the tree once per id.
 *
 * @param doc - Searched but not modified
 * @param wantedIds - Ids to look for; the walk stops as soon as every one is found.
 *   Omitted locates every object in the tree
 * @returns Each found id with its location; when an id is carried twice, the first in
 *   pre-order (a group before its children). An id no object carries has no entry. The
 *   indexes go stale once a `siblings` array is spliced, the object references do not
 */
export const locateObjects = (
	doc: CanvasDoc,
	wantedIds?: ReadonlySet<string>,
): Map<string, ObjectLocation> => {
	const locations = new Map<string, ObjectLocation>();
	const isComplete = (): boolean =>
		wantedIds !== undefined && locations.size === wantedIds.size;
	const visit = (siblings: ObjectDoc[]): boolean => {
		for (let index = 0; index < siblings.length; index += 1) {
			const object = siblings[index];
			if (
				(wantedIds === undefined || wantedIds.has(object.id)) &&
				!locations.has(object.id)
			) {
				locations.set(object.id, {
					object: object as ObjectRecord,
					siblings,
					index,
				});
				if (isComplete()) {
					return true;
				}
			}
			if (visit(readChildren(object))) {
				return true;
			}
		}
		return false;
	};
	if (!isComplete()) {
		visit(doc.root);
	}
	return locations;
};

/**
 * Read one id out of what {@link locateObjects} found, failing when it found nothing.
 *
 * @param locatedObjects - A {@link locateObjects} result whose walk looked for `id`;
 *   an id it was not asked for reads as missing
 * @param id - Id to read
 * @returns The located object
 * @throws {@link DocOperationError} when no object carries the id
 */
export const requireLocatedObject = (
	locatedObjects: ReadonlyMap<string, ObjectLocation>,
	id: string,
): ObjectLocation => {
	const found = locatedObjects.get(id);
	if (found === undefined) {
		throw new DocOperationError(`object not found: ${id}`);
	}
	return found;
};

/**
 * Locate an object by id, recursing into group children.
 *
 * @param doc - Searched but not modified
 * @param id - Id to look for; ids are unique across the whole root tree (ids.ts)
 * @returns The object with its parent array and index
 * @throws {@link DocOperationError} when no object carries the id
 */
export const requireObject = (doc: CanvasDoc, id: string): ObjectLocation =>
	requireLocatedObject(locateObjects(doc, new Set([id])), id);

/**
 * Locate every id in one walk of the tree, so a bulk op can reject a bad id before it
 * mutates anything.
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
	const locations = locateObjects(doc, new Set(ids));
	const missingIds = ids.filter((id) => !locations.has(id));
	if (missingIds.length > 0) {
		throw new DocOperationError(`object not found: ${missingIds.join(", ")}`);
	}
	return ids.map((id) => locations.get(id) as ObjectLocation);
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

/** Walk every object in the tree, groups included; a group is visited before its children. */
export const visitObjects = (
	siblings: readonly ObjectDoc[],
	visit: (object: ObjectRecord) => void,
): void => {
	for (const object of siblings as readonly ObjectRecord[]) {
		visit(object);
		visitObjects(readChildren(object), visit);
	}
};

/** Every object's id, in the order {@link visitObjects} walks the tree. */
export const listObjectIdsInTreeOrder = (doc: CanvasDoc): string[] => {
	const treeOrderIds: string[] = [];
	visitObjects(doc.root, ({ id }) => {
		treeOrderIds.push(id);
	});
	return treeOrderIds;
};

/**
 * Ids of `object` and of every descendant reachable through `children`. Unlike
 * {@link readChildren} this goes inside an opaque object too, since a connector may be
 * attached to what it holds and has to go when it does.
 */
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
			if (siblings[index].type !== GroupFeatures.type) {
				continue;
			}
			const children = readChildren(siblings[index]);
			visit(children);
			if (children.length === 0) {
				droppedIds.push(siblings[index].id);
				siblings.splice(index, 1);
			}
		}
	};
	visit(doc.root);
	return droppedIds;
};

/** Ids listed more than once, each named once, in the order they were first repeated. */
export const findRepeatedIds = (ids: readonly string[]): string[] => {
	const seenIds = new Set<string>();
	const repeatedIds = new Set<string>();
	for (const id of ids) {
		if (seenIds.has(id)) {
			repeatedIds.add(id);
		} else {
			seenIds.add(id);
		}
	}
	return [...repeatedIds];
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

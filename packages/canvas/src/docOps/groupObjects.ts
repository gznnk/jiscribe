import { DocOperationError } from "./errors";
import { generateUniqueId } from "./ids";
import {
	collectObjectIds,
	dropEmptyGroups,
	type ObjectLocation,
	type ObjectRecord,
	rejectIds,
	requireObject,
	requireObjects,
} from "./objectAccess";
import { isConnectorObject } from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import { GroupFeatures } from "../schemas/objects/primitives/group/GroupDoc";

/**
 * Read `id` as a group, failing when it is something else or is turned.
 * A rotated group's rotation stands for its children as a whole, so a member joining
 * or leaving would be swung to a place the caller never asked for.
 */
const requireUnrotatedGroup = (
	doc: CanvasDoc,
	id: string,
): ObjectLocation & { children: ObjectDoc[] } => {
	const location = requireObject(doc, id);
	const { object } = location;
	if (object.type !== GroupFeatures.type || !Array.isArray(object.children)) {
		throw new DocOperationError(`${id} is "${object.type}", not a group`);
	}
	if (typeof object.rotation === "number" && object.rotation !== 0) {
		throw new DocOperationError(
			`${id} is rotated by ${object.rotation}°: the rotation stands for its children as a whole, so members cannot be added or taken out`,
		);
	}
	return { ...location, children: object.children as ObjectDoc[] };
};

/** The group holding `id`, or undefined when the object sits at the root. */
const findHoldingGroup = (
	doc: CanvasDoc,
	id: string,
): ObjectLocation | undefined => {
	const visit = (siblings: ObjectDoc[]): ObjectLocation | undefined => {
		for (const [index, object] of siblings.entries()) {
			const children = (object as ObjectRecord).children;
			if (!Array.isArray(children)) {
				continue;
			}
			if ((children as ObjectDoc[]).some((child) => child.id === id)) {
				return { object: object as ObjectRecord, siblings, index };
			}
			const found = visit(children as ObjectDoc[]);
			if (found !== undefined) {
				return found;
			}
		}
		return undefined;
	};
	return visit(doc.root);
};

/**
 * Wrap several objects in a new group and return its id, mutating `doc` in place.
 *
 * The group takes the position of the earliest member in the drawing order, and the members
 * keep their order inside it. A group stores no frame of its own — it is measured from its
 * children — so grouping never moves anything.
 *
 * Connectors are left out: they already follow the objects they join, so a connector between
 * two members moves with the group without being part of it.
 *
 * @param doc - Mutated in place: the members are lifted out and the group put in their place
 * @param ids - Ids to group; at least 2, all existing, and all siblings of one another (a
 *   group cannot span two different parents)
 * @returns The id assigned to the new group, `group-N` unique across the root tree
 * @throws {@link DocOperationError} for fewer than 2 ids, an id that is missing, a connector,
 *   or a set spread across different parents — before anything is moved
 */
export const groupObjects = (
	doc: CanvasDoc,
	ids: readonly string[],
): string => {
	if (ids.length < 2) {
		throw new DocOperationError(
			`grouping needs at least 2 objects, got ${ids.length}`,
		);
	}
	const locations = requireObjects(doc, ids);

	const connectorIds = locations
		.filter(({ object }) => isConnectorObject(object))
		.map(({ object }) => object.id);
	if (connectorIds.length > 0) {
		throw new DocOperationError(
			`${connectorIds.join(", ")}: a connector follows the objects it joins and cannot be grouped`,
		);
	}
	const [first, ...rest] = locations;
	if (rest.some(({ siblings }) => siblings !== first.siblings)) {
		throw new DocOperationError(
			"every object to group must sit next to the others; ungroup them first",
		);
	}

	const siblings = first.siblings;
	const orderedIndexes = [...new Set(locations.map(({ index }) => index))].sort(
		(left, right) => left - right,
	);
	const children = orderedIndexes.map((index) => siblings[index]);
	const group = {
		id: generateUniqueId(doc, GroupFeatures.type),
		type: GroupFeatures.type,
		children,
	} as unknown as ObjectDoc;

	// Splice from the back so the earlier indexes stay valid while removing.
	for (const index of [...orderedIndexes].reverse()) {
		siblings.splice(index, 1);
	}
	siblings.splice(orderedIndexes[0], 0, group);
	return group.id;
};

/**
 * Dissolve a group, putting its children back where the group was. Mutates `doc` in place.
 *
 * @param doc - Mutated in place
 * @param id - Id of the group to dissolve; must exist and be a group
 * @returns The ids released, in drawing order
 * @throws {@link DocOperationError} when the id is missing, is not a group, or names a
 *   rotated group — whose rotation applies to the children as a whole and has nowhere to
 *   go once they stand on their own
 */
export const ungroupObject = (doc: CanvasDoc, id: string): string[] => {
	const { siblings, index, children } = requireUnrotatedGroup(doc, id);
	siblings.splice(index, 1, ...children);
	return children.map((child) => child.id);
};

/**
 * Move objects that are already in the doc into an existing group, mutating `doc` in place.
 *
 * They are appended in the order given, so they end up drawn on top of what the group
 * already held; an object that is already a member is moved to that end too. Nothing moves
 * unless every id passes, and a group left empty by the move is dropped the way a deletion
 * drops it.
 *
 * @param doc - Mutated in place: the objects are lifted out of wherever they sat
 * @param groupId - Target group; must exist, be a group, and not be rotated
 * @param ids - Ids to move in; each must exist and be neither a connector (it follows the
 *   objects it joins), nor the target group, nor a group containing the target
 * @returns The ids of the groups dropped for being left empty, in the order they went
 * @throws {@link DocOperationError} for a missing or rotated target, an id that does not
 *   exist, a connector, or a move that would put the group inside itself — before anything moves
 */
export const addObjectsToGroup = (
	doc: CanvasDoc,
	groupId: string,
	ids: readonly string[],
): string[] => {
	const group = requireUnrotatedGroup(doc, groupId);
	// A repeated id would splice the same object twice and take a bystander with it.
	const locations = requireObjects(doc, [...new Set(ids)]);

	rejectIds(
		locations
			.filter(({ object }) => isConnectorObject(object))
			.map(({ object }) => object.id),
		"a connector follows the objects it joins and cannot be grouped",
	);
	rejectIds(
		locations
			.filter(({ object }) => collectObjectIds(object).includes(groupId))
			.map(({ object }) => object.id),
		`cannot go into ${groupId}: a group cannot end up inside itself`,
	);

	// Splice by identity, since removing one object invalidates the others' indexes.
	for (const { object, siblings } of locations) {
		siblings.splice(siblings.indexOf(object), 1);
	}
	group.children.push(...locations.map(({ object }) => object));
	return dropEmptyGroups(doc);
};

export type RemoveFromGroupResult = {
	/** The ids taken out, in the order they were given. */
	releasedIds: string[];
	/** Groups dropped for being left with nothing, innermost first. */
	droppedGroupIds: string[];
};

/**
 * Take objects out of the group holding them and put them back beside it, mutating `doc`
 * in place. The reverse of {@link addObjectsToGroup}; use {@link ungroupObject} to dissolve
 * a whole group instead.
 *
 * Each object lands directly after its former group in drawing order, so it keeps sitting
 * on top of the rest of it. A group left with nothing is dropped, which makes taking every
 * member out the same thing as ungrouping.
 *
 * @param doc - Mutated in place
 * @param ids - Ids to take out; each must exist and sit inside a group that is not rotated
 * @returns What left the group and which groups that emptied
 * @throws {@link DocOperationError} for a missing id, an object that is not in a group, or
 *   one held by a rotated group — before anything moves
 */
export const removeObjectsFromGroup = (
	doc: CanvasDoc,
	ids: readonly string[],
): RemoveFromGroupResult => {
	// A repeated id would splice the same object twice and take a bystander with it.
	const locations = requireObjects(doc, [...new Set(ids)]);
	const holders = locations.map(({ object }) => ({
		object,
		holder: findHoldingGroup(doc, object.id),
	}));

	rejectIds(
		holders
			.filter(({ holder }) => holder === undefined)
			.map(({ object }) => object.id),
		"is not inside a group, so there is nothing to take it out of",
	);
	const moves = holders.map(({ object, holder }) => ({
		object,
		// Reject every rotated holder up front, so no half of the move is written.
		holder: requireUnrotatedGroup(doc, (holder as ObjectLocation).object.id),
	}));

	// Collected per holder so members leaving the same group keep the given order.
	// The key is the group object itself: each lookup builds a fresh location record.
	const membersByHolder = new Map<
		ObjectRecord,
		{ holder: ObjectLocation; leaving: ObjectRecord[] }
	>();
	for (const { object, holder } of moves) {
		const collected = membersByHolder.get(holder.object);
		if (collected === undefined) {
			membersByHolder.set(holder.object, { holder, leaving: [object] });
		} else {
			collected.leaving.push(object);
		}
	}
	for (const { holder, leaving } of membersByHolder.values()) {
		const children = holder.object.children as ObjectDoc[];
		for (const object of leaving) {
			children.splice(children.indexOf(object), 1);
		}
		holder.siblings.splice(
			holder.siblings.indexOf(holder.object) + 1,
			0,
			...leaving,
		);
	}
	return {
		releasedIds: locations.map(({ object }) => object.id),
		droppedGroupIds: dropEmptyGroups(doc),
	};
};

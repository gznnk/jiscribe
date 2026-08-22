import { DocOperationError } from "./errors";
import { batchItemError } from "./utils/batchErrors";
import { generateUniqueId } from "./utils/ids";
import {
	collectObjectIds,
	dropEmptyGroups,
	type ObjectLocation,
	type ObjectRecord,
	rejectIds,
	requireGroup,
	requireObject,
	requireObjects,
} from "./utils/objectAccess";
import { isConnectorObject } from "./utils/objectGeometry";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../model/objects/base/ObjectDoc";
import { GroupFeatures } from "../model/objects/primitives/group/GroupDoc";

/**
 * {@link requireGroup} that also refuses a turned group.
 * A rotated group's rotation stands for its children as a whole, so a member joining
 * or leaving would be swung to a place the caller never asked for.
 */
const requireUnrotatedGroup = (
	doc: CanvasDoc,
	id: string,
): ObjectLocation & { children: ObjectDoc[] } => {
	const group = requireGroup(doc, id);
	const { rotation } = group.object;
	if (typeof rotation === "number" && rotation !== 0) {
		throw new DocOperationError(
			`${id} is rotated by ${rotation}°: the rotation stands for its children as a whole, so members cannot be added or taken out`,
		);
	}
	return group;
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
 * @param ids - Ids to group; at least 2 distinct ones, all existing, and all siblings of one
 *   another (a group cannot span two different parents). Repeats are counted once
 * @returns The id assigned to the new group, `group-N` unique across the root tree
 * @throws {@link DocOperationError} for fewer than 2 distinct ids, an id that is missing, a
 *   connector, or a set spread across different parents — before anything is moved
 */
export const groupObjects = (
	doc: CanvasDoc,
	ids: readonly string[],
): string => {
	// Counted before the minimum, so ["rect-1", "rect-1"] is one object and not a pair.
	const distinctIds = [...new Set(ids)];
	if (distinctIds.length < 2) {
		throw new DocOperationError(
			`grouping needs at least 2 objects, got ${distinctIds.length}`,
		);
	}
	const locations = requireObjects(doc, distinctIds);

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
export const dissolveGroup = (doc: CanvasDoc, id: string): string[] => {
	const { siblings, index, children } = requireUnrotatedGroup(doc, id);
	siblings.splice(index, 1, ...children);
	return children.map((child) => child.id);
};

/**
 * Dissolve several groups, each putting its children back where it stood. Mutates `doc` in
 * place.
 *
 * A group and a group nested inside it may be named together: the ids are taken in the order
 * given and each is located afresh, so a nested group dissolved after its parent is taken
 * apart where the parent stood, and either order ends with both levels gone and the children
 * in the same drawing order. Such an inner group is not reported as released — its own turn
 * takes it apart — so the result only ever names objects that stand on their own once the
 * call returns.
 *
 * @param doc - Mutated in place
 * @param ids - Ids of the groups to dissolve; all must exist, be groups, and be unrotated.
 *   Repeats are counted once, the second turn having nothing left to dissolve
 * @returns The ids released, in the order their groups were given, each listed once
 * @throws {@link DocOperationError} before dissolving anything, identified as `ids[i] (id)`:
 *   when an id is missing, is not a group, or names a rotated group — whose rotation applies
 *   to the children as a whole and has nowhere to go once they stand on their own
 */
export const dissolveGroups = (
	doc: CanvasDoc,
	ids: readonly string[],
): string[] => {
	const dissolvedIds = new Set(ids);
	// Check every group first: a mid-way failure would leave part of the batch broken up.
	for (const id of dissolvedIds) {
		try {
			requireUnrotatedGroup(doc, id);
		} catch (error) {
			// Reported against the caller's own array, which a repeated id makes wider than the set.
			throw batchItemError("ids", ids.indexOf(id), id, error);
		}
	}

	const releasedIds = new Set<string>();
	for (const id of dissolvedIds) {
		for (const childId of dissolveGroup(doc, id)) {
			if (!dissolvedIds.has(childId)) {
				releasedIds.add(childId);
			}
		}
	}
	return [...releasedIds];
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

export type RemoveObjectsFromGroupResult = {
	/** The ids taken out, in the order they were given. */
	releasedIds: string[];
	/** Groups dropped for being left with nothing, innermost first. */
	droppedGroupIds: string[];
};

/**
 * Take objects out of the group holding them and put them back beside it, mutating `doc`
 * in place. The reverse of {@link addObjectsToGroup}; use {@link dissolveGroup} to dissolve
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
): RemoveObjectsFromGroupResult => {
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

/**
 * The group holding an object, which is what says whether an id stands on its own or is
 * carried by something bigger — a move applied to a member disturbs the group's layout.
 *
 * @param doc - Searched but not modified, group children included
 * @param id - Id of the object to look up; must exist in the root tree
 * @returns The id of the group directly holding it, or null when it sits at the root.
 *   One level only: pass the result back in to climb a nesting
 * @throws {@link DocOperationError} when no object carries the id
 */
export const getParentGroup = (doc: CanvasDoc, id: string): string | null => {
	requireObject(doc, id);
	return findHoldingGroup(doc, id)?.object.id ?? null;
};

/**
 * What a group holds, in drawing order — the reading behind {@link addObjectsToGroup} and
 * {@link removeObjectsFromGroup}.
 *
 * @param doc - Searched but not modified; the group is looked up anywhere in the tree, so
 *   a nested group can be asked about directly
 * @param groupId - Id of the group to read; must exist and be a group
 * @returns The ids of its direct children, back to front. Grandchildren are left out — a
 *   nested group appears as the one id it is, to be passed back in for a level deeper
 * @throws {@link DocOperationError} when the id is missing or is not a group
 */
export const getGroupMembers = (doc: CanvasDoc, groupId: string): string[] =>
	requireGroup(doc, groupId).children.map((child) => child.id);

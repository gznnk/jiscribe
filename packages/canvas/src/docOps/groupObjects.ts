import { DocOperationError } from "./errors";
import { generateUniqueId } from "./ids";
import { requireObject, requireObjects } from "./objectAccess";
import { isConnectorObject } from "./objectGeometry";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../schemas/objects/base/ObjectDoc";
import { GroupFeatures } from "../schemas/objects/primitives/group/GroupDoc";

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
	const { object, siblings, index } = requireObject(doc, id);
	if (object.type !== GroupFeatures.type || !Array.isArray(object.children)) {
		throw new DocOperationError(`${id} is "${object.type}", not a group`);
	}
	if (typeof object.rotation === "number" && object.rotation !== 0) {
		throw new DocOperationError(
			`${id} is rotated by ${object.rotation}°, which its children cannot keep once ungrouped`,
		);
	}
	const children = object.children as ObjectDoc[];
	siblings.splice(index, 1, ...children);
	return children.map((child) => child.id);
};

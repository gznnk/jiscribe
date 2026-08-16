import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import type { EndpointRef } from "../../schemas/objects/types/EndpointRef";
import {
	collectObjectIds,
	dropEmptyGroups,
	type ObjectRecord,
	requireObjects,
} from "../utils/objectAccess";
import { isConnectorObject } from "../utils/objectGeometry";

export type DeleteObjectsResult = {
	/** Every id that left the doc: the named objects, their descendants, and the cascade. */
	deletedIds: string[];
	/** The subset dropped by the cascade rather than named: connectors and emptied groups. */
	cascadedIds: string[];
};

const endpointOwnerId = (endpoint: unknown): string | undefined =>
	(endpoint as EndpointRef | undefined)?.owner?.id;

/** Walk every object in the tree, groups included. */
const visitObjects = (
	siblings: readonly ObjectDoc[],
	visit: (object: ObjectRecord) => void,
): void => {
	for (const object of siblings as readonly ObjectRecord[]) {
		visit(object);
		if (Array.isArray(object.children)) {
			visitObjects(object.children as ObjectDoc[], visit);
		}
	}
};

/** Splice out every object whose id is in `ids`, recursing into group children. */
const removeByIds = (siblings: ObjectDoc[], ids: ReadonlySet<string>): void => {
	for (let index = siblings.length - 1; index >= 0; index -= 1) {
		const object = siblings[index] as ObjectRecord;
		if (ids.has(object.id)) {
			siblings.splice(index, 1);
			continue;
		}
		if (Array.isArray(object.children)) {
			removeByIds(object.children as ObjectDoc[], ids);
		}
	}
};

/**
 * Delete objects by id, mutating `doc` in place.
 *
 * The deletion cascades so the document stays consistent: a group takes its children with
 * it, connectors left with a missing endpoint are removed too, and a group emptied by the
 * cascade goes as well. Nothing is written until every id has been resolved, so a call
 * naming one bad id leaves the document untouched.
 *
 * @param doc - Mutated in place
 * @param ids - Ids to delete; each must exist in the root tree. Naming both a group and one
 *   of its children is harmless — the child is removed once
 * @returns The ids that left the doc, with the cascaded ones listed separately so a caller
 *   can report what it removed on the caller's behalf
 * @throws {@link DocOperationError} naming every id that was not found
 */
export const deleteObjects = (
	doc: CanvasDoc,
	ids: readonly string[],
): DeleteObjectsResult => {
	const locations = requireObjects(doc, ids);
	const namedIds = new Set(
		locations.flatMap(({ object }) => collectObjectIds(object)),
	);

	const cascadedIds: string[] = [];
	visitObjects(doc.root, (object) => {
		if (!isConnectorObject(object) || namedIds.has(object.id)) {
			return;
		}
		const sourceOwnerId = endpointOwnerId(object.source);
		const targetOwnerId = endpointOwnerId(object.target);
		if (
			(sourceOwnerId !== undefined && namedIds.has(sourceOwnerId)) ||
			(targetOwnerId !== undefined && namedIds.has(targetOwnerId))
		) {
			cascadedIds.push(object.id);
		}
	});

	removeByIds(doc.root, new Set([...namedIds, ...cascadedIds]));
	// Removing children can empty a group, and emptying that group can empty its parent.
	cascadedIds.push(...dropEmptyGroups(doc));

	return { deletedIds: [...namedIds, ...cascadedIds], cascadedIds };
};

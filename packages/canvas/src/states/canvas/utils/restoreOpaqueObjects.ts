import { isArray, isObject } from "@jiscribe/basic-validators";
import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { GroupDoc } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import { GroupFeatures } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";

import { readEndpointOwnerId } from "../../utils/readEndpointOwnerId";
import type {
	OpaqueObjectLoadedPlace,
	OpaqueObjectPlacement,
} from "../OpaqueObjectPlacement";

/** Where one opaque object goes back: a container, and the child it follows. */
type InsertionPoint = {
	/** The group to insert into; undefined for the root. */
	parentId: string | undefined;
	/** The child it goes right after; undefined for the back of the container. */
	afterId: string | undefined;
};

/** Adds the ids of `value` and of everything reachable through `children` arrays. */
const collectNestedIds = (value: unknown, ids: Set<string>): void => {
	if (!isObject(value)) {
		return;
	}
	if (typeof value.id === "string") {
		ids.add(value.id);
	}
	if (isArray(value.children)) {
		value.children.forEach((child) => collectNestedIds(child, ids));
	}
};

/**
 * The first place whose container is still in the tree, placed after the
 * nearest object that was drawn before it at load and still sits in that same
 * container. The root is always the last place, so something always answers.
 */
const resolveInsertionPoint = (
	loadedPlaces: readonly OpaqueObjectLoadedPlace[],
	childrenByContainer: ReadonlyMap<string | undefined, ObjectDoc[]>,
	containerOf: ReadonlyMap<string, string | undefined>,
): InsertionPoint => {
	for (const loadedPlace of loadedPlaces) {
		if (!childrenByContainer.has(loadedPlace.parentId)) {
			continue;
		}
		for (
			let index = loadedPlace.precedingSiblingCount - 1;
			index >= 0;
			index -= 1
		) {
			const precedingId = loadedPlace.knownSiblingIds[index];
			if (
				containerOf.has(precedingId) &&
				containerOf.get(precedingId) === loadedPlace.parentId
			) {
				return { parentId: loadedPlace.parentId, afterId: precedingId };
			}
		}
		return { parentId: loadedPlace.parentId, afterId: undefined };
	}
	return { parentId: undefined, afterId: undefined };
};

/**
 * Puts the opaque objects back into a document tree rebuilt from state, each
 * where it sat among its siblings (see {@link OpaqueObjectPlacement.loadedPlaces}).
 *
 * An opaque connector with an end on an object that is no longer in the tree is
 * left out, the way deleting a shape takes its connectors on the canvas; kept,
 * it would leave the document with a dangling reference the parser rejects.
 *
 * @param root - The rebuilt root; it and every group's `children` must be arrays
 *   fresh from `canvasToDoc`, since they are spliced in place
 * @param placements - The state's opaque objects, in document order; objects
 *   that go back to the same point keep that order
 * @returns `root`, now holding the opaque objects
 */
export const restoreOpaqueObjects = (
	root: ObjectDoc[],
	placements: readonly OpaqueObjectPlacement[],
): ObjectDoc[] => {
	const childrenByContainer = new Map<string | undefined, ObjectDoc[]>([
		[undefined, root],
	]);
	const containerOf = new Map<string, string | undefined>();
	const indexTree = (
		children: readonly ObjectDoc[],
		parentId: string | undefined,
	): void => {
		children.forEach((child) => {
			containerOf.set(child.id, parentId);
			if (child.type === GroupFeatures.type) {
				const groupChildren = (child as GroupDoc).children;
				childrenByContainer.set(child.id, groupChildren);
				indexTree(groupChildren, child.id);
			}
		});
	};
	indexTree(root, undefined);

	const presentIds = new Set(containerOf.keys());
	placements.forEach(({ doc }) => {
		if (doc.type !== ConnectorFeatures.type) {
			collectNestedIds(doc, presentIds);
		}
	});
	const isPresentEnd = (endpoint: unknown): boolean => {
		const ownerId = readEndpointOwnerId(endpoint);
		return ownerId === undefined || presentIds.has(ownerId);
	};

	const insertions = new Map<
		string | undefined,
		Map<string | undefined, ObjectDoc[]>
	>();
	placements.forEach(({ doc, loadedPlaces }) => {
		if (
			doc.type === ConnectorFeatures.type &&
			!(isPresentEnd(doc.source) && isPresentEnd(doc.target))
		) {
			return;
		}
		const { parentId, afterId } = resolveInsertionPoint(
			loadedPlaces,
			childrenByContainer,
			containerOf,
		);
		const byAfterId =
			insertions.get(parentId) ?? new Map<string | undefined, ObjectDoc[]>();
		insertions.set(parentId, byAfterId);
		const docsAtPoint = byAfterId.get(afterId);
		if (docsAtPoint === undefined) {
			byAfterId.set(afterId, [doc]);
		} else {
			docsAtPoint.push(doc);
		}
	});

	insertions.forEach((byAfterId, parentId) => {
		// Every key of insertions came from a container resolveInsertionPoint found.
		const children = childrenByContainer.get(parentId) as ObjectDoc[];
		const merged = [
			...(byAfterId.get(undefined) ?? []),
			...children.flatMap((child) => [
				child,
				...(byAfterId.get(child.id) ?? []),
			]),
		];
		children.splice(0, children.length, ...merged);
	});
	return root;
};

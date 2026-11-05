import type { Rect } from "@jiscribe/geometry";
import { type PlacementCandidate, resolvePlacements } from "@jiscribe/layout";

import { type ObjectRecord, readChildren } from "./objectAccess";
import {
	type DocDefinitions,
	getObjectBounds,
	isConnectorObject,
	requireObjectBounds,
} from "./objectGeometry";
import { GroupFeatures } from "../../model/objects/primitives/group/GroupDoc";

/** A shape whose type declares itself a container other objects sit inside (`ObjectDocDefinition.container`). */
const isContainerShape = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): boolean => definitions.get(object.type)?.container !== undefined;

/**
 * Room the container's type keeps for its title band on this object; a group has none,
 * and a band that is not a finite positive number counts as none.
 */
const readTitleHeight = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): number => {
	const titleHeight = definitions
		.get(object.type)
		?.container?.(object).titleHeight;
	return titleHeight !== undefined &&
		Number.isFinite(titleHeight) &&
		titleHeight > 0
		? titleHeight
		: 0;
};

const isGroupObject = (object: ObjectRecord): boolean =>
	object.type === GroupFeatures.type;

/** `parentId` is the container the object ends up inside. */
export type PlacedNode = {
	object: ObjectRecord;
	bounds: Rect;
	parentId?: string;
};

/**
 * A group (members: its children) or a container shape (members: what lies inside it).
 * `bounds` is the container shape's own box, or the box a group's children occupy.
 */
export type PlacedContainer = {
	object: ObjectRecord;
	bounds: Rect;
	isShape: boolean;
	parentId?: string;
	titleHeight: number;
};

/**
 * Sort the candidates into the nodes to place and the containers around them, by the
 * rules of `resolvePlacements` (`@jiscribe/layout`): a group's members are its children,
 * a container shape's are the candidates at its own level lying inside it.
 *
 * @param candidates - The objects named, or the root's objects; an object reached twice
 *   (a group and a child of it both named) counts once
 * @param definitions - Type table `container` and `features.geometry` are read from
 * @param skipsUnmeasurable - True when the candidates were not named: an object the build
 *   cannot measure (an unknown type) is then left out instead of failing the call
 * @returns The nodes in the order found, then the container shapes that hold nothing
 *   (laid out as nodes), and the containers that hold something
 */
export const collectPlacements = (
	candidates: readonly ObjectRecord[],
	definitions: DocDefinitions,
	skipsUnmeasurable: boolean,
): { nodes: PlacedNode[]; containers: PlacedContainer[] } => {
	const objectById = new Map<string, ObjectRecord>();
	const toCandidates = (
		objects: readonly ObjectRecord[],
	): PlacementCandidate[] => {
		const placementCandidates: PlacementCandidate[] = [];
		for (const object of objects) {
			if (isConnectorObject(object)) {
				continue;
			}
			const bounds = skipsUnmeasurable
				? (getObjectBounds(object, definitions) ?? undefined)
				: requireObjectBounds(object, definitions);
			if (bounds === undefined) {
				continue;
			}
			if (!objectById.has(object.id)) {
				objectById.set(object.id, object);
			}
			if (isGroupObject(object)) {
				placementCandidates.push({
					id: object.id,
					bounds,
					kind: "group",
					children: toCandidates(readChildren(object)),
				});
			} else if (isContainerShape(object, definitions)) {
				placementCandidates.push({
					id: object.id,
					bounds,
					kind: "containerShape",
					titleHeight: readTitleHeight(object, definitions),
				});
			} else {
				placementCandidates.push({ id: object.id, bounds, kind: "node" });
			}
		}
		return placementCandidates;
	};
	const { nodes, containers } = resolvePlacements(toCandidates(candidates));
	const objectOf = (id: string): ObjectRecord =>
		objectById.get(id) as ObjectRecord;
	return {
		nodes: nodes.map(({ id, bounds, parentId }) => ({
			object: objectOf(id),
			bounds,
			...(parentId !== undefined ? { parentId } : {}),
		})),
		containers: containers.map(
			({ id, bounds, isShape, parentId, titleHeight }) => ({
				object: objectOf(id),
				bounds,
				isShape,
				...(parentId !== undefined ? { parentId } : {}),
				titleHeight,
			}),
		),
	};
};

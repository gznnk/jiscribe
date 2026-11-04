import type { Rect } from "@jiscribe/geometry";

import { type ObjectRecord, readChildren } from "./objectAccess";
import {
	type DocDefinitions,
	getObjectBounds,
	isConnectorObject,
	requireObjectBounds,
} from "./objectGeometry";
import { GroupFeatures } from "../../model/objects/primitives/group/GroupDoc";

/** A shape whose type declares itself a container other objects sit inside (`features.container`). */
const isContainerShape = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): boolean => definitions.get(object.type)?.features.container !== undefined;

/** Room the container's type keeps for its title band; a group has none. */
export const readTitleHeight = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): number => definitions.get(object.type)?.features.container?.titleHeight ?? 0;

const isGroupObject = (object: ObjectRecord): boolean =>
	object.type === GroupFeatures.type;

const isRectInside = (outer: Rect, inner: Rect): boolean =>
	inner.x >= outer.x &&
	inner.y >= outer.y &&
	inner.x + inner.width <= outer.x + outer.width &&
	inner.y + inner.height <= outer.y + outer.height;

/** `groupId` is the group the object was found in; `parentId` the container it ends up inside. */
export type PlacedNode = {
	object: ObjectRecord;
	bounds: Rect;
	groupId?: string;
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
	groupId?: string;
	parentId?: string;
};

/**
 * Sort the candidates into the nodes to place and the containers around them. A group's
 * members are its children; a container shape's members are the candidates at its own level
 * that lie inside it, the smallest such container winning when they nest. A container
 * holding nothing to place is a node like any other, so it still moves with the drawing.
 *
 * @param candidates - The objects named, or the root's objects; an object reached twice
 *   (a group and a child of it both named) counts once
 * @param definitions - Type table `features.container` and `features.geometry` are read from
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
	const nodes: PlacedNode[] = [];
	const containers: PlacedContainer[] = [];
	const seenIds = new Set<string>();
	const measure = (object: ObjectRecord): Rect | undefined => {
		if (!skipsUnmeasurable) {
			return requireObjectBounds(object, definitions);
		}
		return getObjectBounds(object, definitions) ?? undefined;
	};
	const visit = (objects: readonly ObjectRecord[], groupId?: string): void => {
		for (const object of objects) {
			if (isConnectorObject(object) || seenIds.has(object.id)) {
				continue;
			}
			seenIds.add(object.id);
			const bounds = measure(object);
			if (bounds === undefined) {
				continue;
			}
			if (isGroupObject(object)) {
				containers.push({
					object,
					bounds,
					isShape: false,
					groupId,
					parentId: groupId,
				});
				visit(readChildren(object), object.id);
			} else if (isContainerShape(object, definitions)) {
				containers.push({
					object,
					bounds,
					isShape: true,
					groupId,
					parentId: groupId,
				});
			} else {
				nodes.push({ object, bounds, groupId, parentId: groupId });
			}
		}
	};
	visit(candidates);
	// Geometry decides what a container shape holds: among what sits at its level, the
	// smallest container around a box is its parent.
	const containerShapes = containers.filter(({ isShape }) => isShape);
	const area = ({ bounds }: PlacedContainer): number =>
		bounds.width * bounds.height;
	const adopt = (placed: PlacedNode | PlacedContainer): void => {
		let smallest: PlacedContainer | undefined;
		for (const container of containerShapes) {
			if (
				container.object === placed.object ||
				container.groupId !== placed.groupId ||
				!isRectInside(container.bounds, placed.bounds)
			) {
				continue;
			}
			if (smallest === undefined || area(container) < area(smallest)) {
				smallest = container;
			}
		}
		if (smallest !== undefined) {
			placed.parentId = smallest.object.id;
		}
	};
	for (const placed of [...containers, ...nodes]) {
		adopt(placed);
	}
	// A container holds something to place when a node sits in it, or in a container
	// in it: mark the containers of every node, then every ancestor of a marked one.
	const containerById = new Map(
		containers.map((container) => [container.object.id, container] as const),
	);
	const occupiedIds = new Set<string>();
	const markUpward = (containerId: string | undefined): void => {
		let current = containerId;
		while (current !== undefined && !occupiedIds.has(current)) {
			occupiedIds.add(current);
			current = containerById.get(current)?.parentId;
		}
	};
	for (const node of nodes) {
		markUpward(node.parentId);
	}
	const occupied = containers.filter(({ object }) =>
		occupiedIds.has(object.id),
	);
	// An empty container shape is placed as a box of its own; an empty group holds
	// nothing to place at all.
	for (const container of containers) {
		if (!occupiedIds.has(container.object.id) && container.isShape) {
			nodes.push({
				object: container.object,
				bounds: container.bounds,
				groupId: container.groupId,
				parentId: container.parentId,
			});
		}
	}
	for (const placed of [...nodes, ...occupied]) {
		if (placed.parentId !== undefined && !occupiedIds.has(placed.parentId)) {
			placed.parentId = undefined;
		}
	}
	return { nodes, containers: occupied };
};

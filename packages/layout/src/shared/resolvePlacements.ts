import type { Rect } from "@jiscribe/geometry";

import { isRectInside } from "./isRectInside";

/** An object offered to {@link resolvePlacements}, before it is sorted into a node or a container. */
export type PlacementCandidate = {
	id: string;
	/** The box the object occupies, in the space every candidate shares. */
	bounds: Rect;
	/**
	 * `group`: a container around its `children`. `containerShape`: a container around the
	 * candidates at its own level that lie inside it. `node`: a box to place.
	 */
	kind: "node" | "group" | "containerShape";
	/**
	 * Height in px of a container shape's title band (see
	 * `LayoutGraphContainer.titleHeight`), as the type answers it; read only on a
	 * container shape. Missing, or anything but a finite positive number, counts as 0.
	 */
	titleHeight?: number;
	/** A group's children, connectors left out; read only on a group. */
	children?: readonly PlacementCandidate[];
};

export type ResolvedNode = {
	id: string;
	/** The candidate's box, as given. */
	bounds: Rect;
	/** Id of the container the node is laid out inside, among the resolved containers. */
	parentId?: string;
};

export type ResolvedContainer = {
	id: string;
	/** A container shape's own box, or the box a group's children occupy, as given. */
	bounds: Rect;
	/** True for a container shape, which has a box of its own; false for a group. */
	isShape: boolean;
	/** Id of the container this one sits inside, among the resolved containers. */
	parentId?: string;
	/** The candidate's `titleHeight` for a container shape, 0 when it is not a finite positive number; 0 for a group. */
	titleHeight: number;
};

/** The candidate's title band, with anything but a finite positive number read as none. */
const readTitleHeight = ({ titleHeight }: PlacementCandidate): number =>
	titleHeight !== undefined && Number.isFinite(titleHeight) && titleHeight > 0
		? titleHeight
		: 0;

type Placement = {
	candidate: PlacementCandidate;
	/** The group the candidate was found in, which is the level a container shape adopts at. */
	groupId?: string;
	parentId?: string;
};

/**
 * Sort candidates into the nodes to place and the containers around them, as
 * `computeLayeredLayout` takes them. A group's members are its children; a container
 * shape's members are the candidates at its own level (the same group, or none) that
 * lie inside it, the smallest such container winning when they nest; of two with the
 * same box, the one found first holds the other. A container shape
 * holding nothing to place is a node like any other, so it still moves with the
 * drawing; a group holding nothing is dropped.
 *
 * @param candidates - The objects to arrange, connectors left out, in the order the
 *   layout should see them (dagre's result depends on it). A candidate reached a second
 *   time, named itself and as a group's child, counts the first time only
 * @returns The nodes in the order found, then the container shapes that hold nothing
 *   (as nodes); and the containers that hold something, in the order found. A
 *   `parentId` always names one of the returned containers
 */
export const resolvePlacements = (
	candidates: readonly PlacementCandidate[],
): { nodes: ResolvedNode[]; containers: ResolvedContainer[] } => {
	const nodes: Placement[] = [];
	const containers: Placement[] = [];
	const seenIds = new Set<string>();
	const visit = (
		levelCandidates: readonly PlacementCandidate[],
		groupId?: string,
	): void => {
		for (const candidate of levelCandidates) {
			if (seenIds.has(candidate.id)) {
				continue;
			}
			seenIds.add(candidate.id);
			const placement = { candidate, groupId, parentId: groupId };
			if (candidate.kind === "group") {
				containers.push(placement);
				visit(candidate.children ?? [], candidate.id);
			} else if (candidate.kind === "containerShape") {
				containers.push(placement);
			} else {
				nodes.push(placement);
			}
		}
	};
	visit(candidates);
	// Geometry decides what a container shape holds: among what sits at its level, the
	// smallest container around a box is its parent.
	const containerShapes = containers.filter(
		({ candidate }) => candidate.kind === "containerShape",
	);
	const area = ({ candidate }: Placement): number =>
		candidate.bounds.width * candidate.bounds.height;
	const isSameBox = (first: Placement, second: Placement): boolean =>
		isRectInside(first.candidate.bounds, second.candidate.bounds) &&
		isRectInside(second.candidate.bounds, first.candidate.bounds);
	const foundIndexOf = new Map(
		containerShapes.map((container, index) => [container, index] as const),
	);
	const adopt = (placement: Placement): void => {
		let smallest: Placement | undefined;
		for (const container of containerShapes) {
			if (
				container === placement ||
				container.groupId !== placement.groupId ||
				!isRectInside(container.candidate.bounds, placement.candidate.bounds)
			) {
				continue;
			}
			// Of two container shapes with the same box, the one found first holds the
			// other, so the two do not each hold the other.
			const placementIndex = foundIndexOf.get(placement);
			if (
				placementIndex !== undefined &&
				(foundIndexOf.get(container) as number) > placementIndex &&
				isSameBox(container, placement)
			) {
				continue;
			}
			if (
				smallest === undefined ||
				area(container) < area(smallest) ||
				isSameBox(container, smallest)
			) {
				smallest = container;
			}
		}
		if (smallest !== undefined) {
			placement.parentId = smallest.candidate.id;
		}
	};
	for (const placement of [...containers, ...nodes]) {
		adopt(placement);
	}
	// A container holds something to place when a node sits in it, or in a container
	// in it: mark the containers of every node, then every ancestor of a marked one.
	const containerById = new Map(
		containers.map((container) => [container.candidate.id, container] as const),
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
	const occupied = containers.filter(({ candidate }) =>
		occupiedIds.has(candidate.id),
	);
	// An empty container shape is placed as a box of its own; an empty group holds
	// nothing to place at all.
	for (const container of containers) {
		if (
			!occupiedIds.has(container.candidate.id) &&
			container.candidate.kind === "containerShape"
		) {
			nodes.push(container);
		}
	}
	const parentOf = ({ parentId }: Placement): { parentId?: string } =>
		parentId !== undefined && occupiedIds.has(parentId) ? { parentId } : {};
	return {
		nodes: nodes.map((placement) => ({
			id: placement.candidate.id,
			bounds: placement.candidate.bounds,
			...parentOf(placement),
		})),
		containers: occupied.map((placement) => {
			const isShape = placement.candidate.kind === "containerShape";
			return {
				id: placement.candidate.id,
				bounds: placement.candidate.bounds,
				isShape,
				...parentOf(placement),
				titleHeight: isShape ? readTitleHeight(placement.candidate) : 0,
			};
		}),
	};
};

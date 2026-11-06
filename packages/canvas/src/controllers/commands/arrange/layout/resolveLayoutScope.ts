import { sortEdgesByEndOrder } from "@jiscribe/doc/model/objects/utils/sortEdgesByEndOrder";
import {
	type LayoutGraphEdge,
	type PlacementCandidate,
	type ResolvedContainer,
	type ResolvedNode,
	isRectInside,
	resolvePlacements,
	splitLayoutGraph,
} from "@jiscribe/layout";

import { measureObjectBounds } from "./measureObjectBounds";
import { resolveConnectorLabelBox } from "../../../../rendering/objects/connector/geometry/label/connectorLabelLayout";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import {
	type ConnectorState,
	isConnectorState,
} from "../../../../states/objects/connector/ConnectorState";
import { isGroupState } from "../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import { sortObjectIdsByZOrder } from "../../../utils/sortObjectIdsByZOrder";

/** One graph to arrange on its own, as `computeLayeredLayout` takes it once sized. */
export type LayoutScopeGraph = {
	nodes: ResolvedNode[];
	containers: ResolvedContainer[];
	/** In the order the layout reads them (sortEdgesByEndOrder), as the doc layer's layout sorts them. */
	edges: LayoutGraphEdge[];
	/** Connectors with both ends on one node of this graph: no edge, but rerouted. */
	selfLoopIds: string[];
};

type SelfLoop = { connectorId: string; ownerId: string };

/** Fewest nodes a graph needs before arranging it means anything. */
const MIN_LAYOUT_NODES = 2;

/**
 * Every connector of the canvas, the root's first and then each group's children,
 * a group before what it holds, so the order never depends on insertion into `objects`.
 */
export const collectConnectorsInTreeOrder = (
	state: CanvasControllerState,
): ConnectorState[] => {
	const connectors: ConnectorState[] = [];
	const visit = (ids: readonly string[]): void => {
		for (const id of ids) {
			const object = state.objects[id];
			if (isConnectorState(object)) {
				connectors.push(object);
			} else if (isGroupState(object)) {
				visit(object.childIds);
			}
		}
	};
	visit(state.rootIds);
	return connectors;
};

/** Every object's id in tree order: the root's back to front, a group before what it holds. */
const listIdsInTreeOrder = (state: CanvasControllerState): string[] => {
	const ids: string[] = [];
	const visit = (siblingIds: readonly string[]): void => {
		for (const id of siblingIds) {
			ids.push(id);
			const object = state.objects[id];
			if (isGroupState(object)) {
				visit(object.childIds);
			}
		}
	};
	visit(state.rootIds);
	return ids;
};

/**
 * The title band a container type answers for this object, read from its doc as the
 * doc layer's layout reads it, or undefined when the type declares no container (the
 * object is a box like any other). resolvePlacements reads a band that is not a
 * finite positive number as none.
 */
const readContainerTitleHeight = (
	object: ObjectState,
	registries: ICanvasRegistries,
): number | undefined => {
	const container = registries.objectContainer.get(object.type);
	return container === undefined
		? undefined
		: container(registries.objectMapper.toDoc(object)).titleHeight;
};

/**
 * The objects named, as the layout's candidates: connectors and objects with no
 * extent are left out, a group carries its children.
 */
const toCandidates = (
	ids: readonly string[],
	state: CanvasControllerState,
	registries: ICanvasRegistries,
): PlacementCandidate[] =>
	ids.flatMap((id): PlacementCandidate[] => {
		const object = state.objects[id];
		if (object === undefined || isConnectorState(object)) {
			return [];
		}
		const bounds = measureObjectBounds(object, state.objects);
		if (bounds === undefined) {
			return [];
		}
		if (isGroupState(object)) {
			return [
				{
					id,
					bounds,
					kind: "group",
					children: toCandidates(object.childIds, state, registries),
				},
			];
		}
		const titleHeight = readContainerTitleHeight(object, registries);
		return titleHeight === undefined
			? [{ id, bounds, kind: "node" }]
			: [{ id, bounds, kind: "containerShape", titleHeight }];
	});

/** The ids sharing the object's parent: the group's children, or the root's objects. */
const listSiblingIds = (
	object: ObjectState,
	state: CanvasControllerState,
): readonly string[] => {
	if (object.parentId === undefined) {
		return state.rootIds;
	}
	const parent = state.objects[object.parentId];
	return isGroupState(parent) ? parent.childIds : [];
};

/**
 * The selection, with what lies inside each selected container shape at its own
 * level added (selecting a VPC arranges its contents), in z order.
 */
const collectSelectedCandidateIds = (
	state: CanvasControllerState,
	registries: ICanvasRegistries,
): string[] => {
	const candidateIds = new Set(state.selection.objectIds);
	for (const selectedId of state.selection.objectIds) {
		const selected = state.objects[selectedId];
		if (
			selected === undefined ||
			registries.objectContainer.get(selected.type) === undefined
		) {
			continue;
		}
		const containerBox = measureObjectBounds(selected, state.objects);
		if (containerBox === undefined) {
			continue;
		}
		for (const siblingId of listSiblingIds(selected, state)) {
			const sibling = state.objects[siblingId];
			if (
				siblingId === selectedId ||
				sibling === undefined ||
				isConnectorState(sibling)
			) {
				continue;
			}
			const siblingBox = measureObjectBounds(sibling, state.objects);
			if (siblingBox !== undefined && isRectInside(containerBox, siblingBox)) {
				candidateIds.add(siblingId);
			}
		}
	}
	return sortObjectIdsByZOrder([...candidateIds], state.objects, state.rootIds);
};

/** The box the label is drawn in, or undefined for a connector without label text. */
const measureLabelBox = (
	connector: ConnectorState,
): { width: number; height: number } | undefined =>
	connector.label === undefined || connector.label.text === ""
		? undefined
		: resolveConnectorLabelBox(connector.label);

/**
 * Every connector whose both ends sit on the given nodes, wherever it lives, split
 * into the graph's edges and the self loops.
 */
const collectEdges = (
	connectors: readonly ConnectorState[],
	nodes: readonly ResolvedNode[],
): { edges: LayoutGraphEdge[]; selfLoops: SelfLoop[] } => {
	const nodeIds = new Set(nodes.map(({ id }) => id));
	const edges: LayoutGraphEdge[] = [];
	const selfLoops: SelfLoop[] = [];
	for (const connector of connectors) {
		const sourceId = connector.source.owner?.id;
		const targetId = connector.target.owner?.id;
		if (
			sourceId === undefined ||
			targetId === undefined ||
			!nodeIds.has(sourceId) ||
			!nodeIds.has(targetId)
		) {
			continue;
		}
		if (sourceId === targetId) {
			selfLoops.push({ connectorId: connector.id, ownerId: sourceId });
			continue;
		}
		const label = measureLabelBox(connector);
		edges.push({
			id: connector.id,
			sourceId,
			targetId,
			...(label !== undefined ? { label } : {}),
		});
	}
	return { edges, selfLoops };
};

/**
 * The nodes and containers the candidates sort into: the selection (see
 * collectSelectedCandidateIds) or, with nothing selected, the root's objects.
 */
const resolveCandidatePlacements = (
	state: CanvasControllerState,
	registries: ICanvasRegistries,
): { nodes: ResolvedNode[]; containers: ResolvedContainer[] } => {
	const candidateIds =
		state.selection.objectIds.length > 0
			? collectSelectedCandidateIds(state, registries)
			: state.rootIds;
	return resolvePlacements(toCandidates(candidateIds, state, registries));
};

/**
 * What an automatic layout arranges. With a selection, the selected objects (and
 * what lies inside a selected container shape) make one graph, arranged even with
 * no connector among them. Without one, the root's objects are split into their
 * connected parts, and only a part joined by at least one connector is arranged, each
 * keeping its own top-left; a part with no line in it is left alone.
 *
 * @returns The graphs to arrange, each with at least two nodes; empty when there is
 *   nothing to arrange
 */
export const resolveLayoutScope = (
	state: CanvasControllerState,
	registries: ICanvasRegistries,
): LayoutScopeGraph[] => {
	const hasSelection = state.selection.objectIds.length > 0;
	const { nodes, containers } = resolveCandidatePlacements(state, registries);
	if (nodes.length < MIN_LAYOUT_NODES) {
		return [];
	}
	const { edges, selfLoops } = collectEdges(
		collectConnectorsInTreeOrder(state),
		nodes,
	);
	const graph = {
		nodes,
		containers,
		edges: sortEdgesByEndOrder(edges, listIdsInTreeOrder(state)),
	};
	const parts = hasSelection
		? [graph]
		: splitLayoutGraph(graph).filter(
				(part) =>
					part.nodes.length >= MIN_LAYOUT_NODES && part.edges.length > 0,
			);
	return parts.map((part) => {
		const partNodeIds = new Set(part.nodes.map(({ id }) => id));
		return {
			...part,
			selfLoopIds: selfLoops
				.filter(({ ownerId }) => partNodeIds.has(ownerId))
				.map(({ connectorId }) => connectorId),
		};
	});
};

/**
 * Whether an automatic layout may have anything to arrange, answered without
 * measuring anything, since the sidebar asks on every frame of a drag: a selection of
 * at least two objects that are not connectors, or of one group or one shape whose
 * type declares a container (what it holds is arranged); with nothing selected, a
 * connector joining two different objects that are not connectors. A stand-in for
 * resolveLayoutScope, which execute runs, returning the state unchanged when it finds
 * nothing to arrange (a selection holding objects with no extent, a canvas whose only
 * lines end on container shapes).
 */
export const hasLayoutScope = (
	state: CanvasControllerState,
	registries: ICanvasRegistries,
): boolean => {
	const selectedIds = state.selection.objectIds;
	if (selectedIds.length > 0) {
		const selectedObjects = selectedIds.flatMap((id) => {
			const object = state.objects[id];
			return object === undefined || isConnectorState(object) ? [] : [object];
		});
		if (selectedObjects.length >= MIN_LAYOUT_NODES) {
			return true;
		}
		const [sole] = selectedObjects;
		return (
			sole !== undefined &&
			(isGroupState(sole) ||
				registries.objectContainer.get(sole.type) !== undefined)
		);
	}
	return Object.values(state.objects).some((object) => {
		if (!isConnectorState(object)) {
			return false;
		}
		const sourceId = object.source.owner?.id;
		const targetId = object.target.owner?.id;
		if (
			sourceId === undefined ||
			targetId === undefined ||
			sourceId === targetId
		) {
			return false;
		}
		const source = state.objects[sourceId];
		const target = state.objects[targetId];
		return (
			source !== undefined &&
			target !== undefined &&
			!isConnectorState(source) &&
			!isConnectorState(target)
		);
	});
};

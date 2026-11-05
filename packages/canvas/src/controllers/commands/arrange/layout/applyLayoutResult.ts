import {
	type EndpointRef,
	type OwnedEndpointRef,
	isConnectPointId,
	toEquivalentEdgeAnchor,
} from "@jiscribe/doc/model/objects/types/EndpointRef";
import { isFrame } from "@jiscribe/geometry";
import type { Frame, Point, Rect } from "@jiscribe/geometry";
import {
	type LayoutDirection,
	type LayoutEdgeAnchor,
	type TakenEnd,
	calcFacingSides,
	computeLayeredLayout,
	createTakenEnds,
} from "@jiscribe/layout";

import {
	type LayoutScopeGraph,
	collectConnectorsInTreeOrder,
} from "./resolveLayoutScope";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import {
	type ConnectorState,
	isConnectorState,
} from "../../../../states/objects/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import { calcObjectBoundingBox } from "../../../utils/calcObjectBoundingBox";
import { moveObjectTree } from "../../../utils/moveObjectTree";

/**
 * Whether an end sits on a connect point the owner's type declares beyond the four
 * edge midpoints (an ER entity's column): it is kept where the author put it.
 */
const keepsOwnAnchor = (endpoint: EndpointRef): boolean =>
	endpoint.anchor.kind === "connectPoint" &&
	!isConnectPointId(endpoint.anchor.id);

const toEdgeEndpoint = (
	ownerId: string,
	{ side, t }: LayoutEdgeAnchor,
): OwnedEndpointRef => ({
	owner: { id: ownerId },
	anchor: { kind: "edge", side, t },
});

/** The connector with its route left to the engine: no corners, no routing of its own. */
const clearRoute = (connector: ConnectorState): ConnectorState => {
	const { routing: _routing, ...rest } = connector;
	return { ...rest, points: [] } as ConnectorState;
};

const noteTakenEnds = (
	connector: ConnectorState,
	takenEnds: TakenEnd[],
): void => {
	for (const endpoint of [connector.source, connector.target]) {
		const ownerId = endpoint.owner?.id;
		const edgeAnchor = toEquivalentEdgeAnchor(endpoint.anchor);
		if (ownerId !== undefined && edgeAnchor !== null) {
			takenEnds.push({ ownerId, side: edgeAnchor.side, t: edgeAnchor.t });
		}
	}
};

const measureBox = (
	object: ObjectState,
	objects: Record<string, ObjectState>,
): Rect | undefined => {
	const box = calcObjectBoundingBox(object, objects);
	return box === null
		? undefined
		: {
				x: box.left,
				y: box.top,
				width: box.right - box.left,
				height: box.bottom - box.top,
			};
};

/**
 * Arrange one graph and write the result into `objects`, in the same whole pixels
 * the doc layer's layout writes (packages/doc/src/ops/layout.ts), so a drawing
 * arranged here and one arranged through the doc come out the same.
 *
 * @param srcObjects - The objects as they were before the layout, which every write starts from
 * @param objects - Written in place
 * @param takenEnds - Gains the ends of every connector written as an edge
 * @returns Ids of the objects written
 */
const layOutGraph = (
	graph: LayoutScopeGraph,
	direction: LayoutDirection,
	srcObjects: Record<string, ObjectState>,
	objects: Record<string, ObjectState>,
	takenEnds: TakenEnd[],
	registries: ICanvasRegistries,
): string[] => {
	const laidOut = computeLayeredLayout(
		graph.nodes.map(({ id, bounds, parentId }) => ({
			id,
			width: bounds.width,
			height: bounds.height,
			...(parentId !== undefined ? { parentId } : {}),
		})),
		graph.edges,
		{ direction },
		graph.containers.map(({ id, parentId, titleHeight }) => ({
			id,
			...(parentId !== undefined ? { parentId } : {}),
			titleHeight,
		})),
	);
	const containerShapes = graph.containers.filter(({ isShape }) => isShape);
	const boxes = [...graph.nodes, ...containerShapes];
	const origin = {
		x: Math.min(...boxes.map(({ bounds }) => bounds.x)),
		y: Math.min(...boxes.map(({ bounds }) => bounds.y)),
	};
	const toCanvasPoint = ({ x, y }: Point): Point => ({
		x: Math.round(origin.x + x),
		y: Math.round(origin.y + y),
	});
	const boundsById = new Map(boxes.map(({ id, bounds }) => [id, bounds]));
	const writtenIds: string[] = [];
	const moveTo = (id: string, before: Rect, after: Rect): void => {
		const topLeft = toCanvasPoint(after);
		moveObjectTree(
			id,
			srcObjects,
			objects,
			{ x: topLeft.x - before.x, y: topLeft.y - before.y },
			registries.objectBehavior,
		);
	};

	for (const laidOutEdge of laidOut.edges) {
		const connector = srcObjects[laidOutEdge.id];
		if (!isConnectorState(connector)) {
			continue;
		}
		const sourceKept = keepsOwnAnchor(connector.source);
		const targetKept = keepsOwnAnchor(connector.target);
		const keepsRoute = !(sourceKept || targetKept);
		const { label } = connector;
		const rerouted: ConnectorState = {
			...clearRoute(connector),
			source: sourceKept
				? connector.source
				: toEdgeEndpoint(
						connector.source.owner?.id as string,
						laidOutEdge.source,
					),
			target: targetKept
				? connector.target
				: toEdgeEndpoint(
						connector.target.owner?.id as string,
						laidOutEdge.target,
					),
			points: keepsRoute ? laidOutEdge.points.map(toCanvasPoint) : [],
			...(keepsRoute &&
			label !== undefined &&
			laidOutEdge.labelPosition !== undefined
				? {
						label: {
							...label,
							position: laidOutEdge.labelPosition,
							offset: laidOutEdge.labelOffset ?? 0,
						},
					}
				: {}),
		};
		objects[connector.id] = rerouted;
		noteTakenEnds(rerouted, takenEnds);
		writtenIds.push(connector.id);
	}

	for (const { id, bounds } of laidOut.nodes) {
		moveTo(id, boundsById.get(id) as Rect, bounds);
		writtenIds.push(id);
	}

	for (const { id, bounds } of laidOut.containers) {
		const before = boundsById.get(id);
		if (before === undefined) {
			// A group: it has no box of its own and follows its children.
			continue;
		}
		const container = srcObjects[id];
		if (
			registries.objectMapper.getFeatures(container.type)?.geometry ===
				"rect" &&
			isFrame(container)
		) {
			// Rounded edge by edge, as the doc layer writes x / y / width / height,
			// so an odd size does not put the centre half a pixel off.
			const width = Math.round(bounds.width);
			const height = Math.round(bounds.height);
			const topLeft = toCanvasPoint(bounds);
			const resized: ObjectState & Frame = {
				...container,
				cx: topLeft.x + width / 2,
				cy: topLeft.y + height / 2,
				width,
				height,
			};
			objects[id] = resized;
		} else {
			moveTo(id, before, bounds);
		}
		writtenIds.push(id);
	}

	// A self loop keeps its ends; its stored corners belong to where the owner was.
	for (const connectorId of graph.selfLoopIds) {
		const connector = srcObjects[connectorId];
		if (isConnectorState(connector)) {
			objects[connectorId] = clearRoute(connector);
			writtenIds.push(connectorId);
		}
	}
	return writtenIds;
};

/**
 * Redraw every connector with an end on an arranged container shape between the
 * facing sides of where its two ends ended up, clear of the ends already on those
 * sides, its route left to the engine. Only a connector whose both ends were
 * arranged is redrawn; an end on a declared connect point stays there.
 *
 * @returns Ids of the connectors redrawn
 */
const redrawContainerConnectors = (
	state: CanvasControllerState,
	graphs: readonly LayoutScopeGraph[],
	objects: Record<string, ObjectState>,
	takenEnds: readonly TakenEnd[],
): string[] => {
	const containerShapeIds = new Set(
		graphs.flatMap(({ containers }) =>
			containers.filter(({ isShape }) => isShape).map(({ id }) => id),
		),
	);
	if (containerShapeIds.size === 0) {
		return [];
	}
	const arrangedIds = new Set([
		...containerShapeIds,
		...graphs.flatMap(({ nodes }) => nodes.map(({ id }) => id)),
	]);
	const boxOf = (id: string): Rect | undefined =>
		arrangedIds.has(id) ? measureBox(objects[id], objects) : undefined;
	const freeEnds = createTakenEnds(takenEnds);
	const redrawnIds: string[] = [];
	for (const srcConnector of collectConnectorsInTreeOrder(state)) {
		const connector = objects[srcConnector.id];
		if (!isConnectorState(connector)) {
			continue;
		}
		const sourceId = connector.source.owner?.id;
		const targetId = connector.target.owner?.id;
		if (
			sourceId === undefined ||
			targetId === undefined ||
			!(containerShapeIds.has(sourceId) || containerShapeIds.has(targetId))
		) {
			continue;
		}
		const sourceBox = boxOf(sourceId);
		const targetBox = boxOf(targetId);
		if (sourceBox === undefined || targetBox === undefined) {
			continue;
		}
		const sides = calcFacingSides(sourceBox, targetBox);
		const redrawn: ConnectorState = {
			...clearRoute(connector),
			source: keepsOwnAnchor(connector.source)
				? connector.source
				: toEdgeEndpoint(
						sourceId,
						freeEnds.place(sourceId, sides.source.side, sourceBox),
					),
			target: keepsOwnAnchor(connector.target)
				? connector.target
				: toEdgeEndpoint(
						targetId,
						freeEnds.place(targetId, sides.target.side, targetBox),
					),
		};
		objects[connector.id] = redrawn;
		redrawnIds.push(connector.id);
	}
	return redrawnIds;
};

/**
 * Arrange each graph on its own and write the result: nodes moved to their new
 * places, container shapes moved (and resized when their geometry is a rect's) around
 * their members, every connector between arranged objects re-anchored on the facing
 * sides with a right-angled route, and self loops left to the engine. Each graph
 * keeps the top-left its nodes and container shapes occupied together. Group frames
 * are not touched; the caller settles them.
 *
 * @param graphs - From resolveLayoutScope; their nodes must not overlap
 * @returns The new object map, and the ids of every object written
 */
export const applyLayoutResult = (
	state: CanvasControllerState,
	graphs: readonly LayoutScopeGraph[],
	direction: LayoutDirection,
	registries: ICanvasRegistries,
): { objects: Record<string, ObjectState>; writtenIds: string[] } => {
	const objects = { ...state.objects };
	const takenEnds: TakenEnd[] = [];
	const writtenIds = graphs.flatMap((graph) =>
		layOutGraph(
			graph,
			direction,
			state.objects,
			objects,
			takenEnds,
			registries,
		),
	);
	writtenIds.push(
		...redrawContainerConnectors(state, graphs, objects, takenEnds),
	);
	return { objects, writtenIds };
};

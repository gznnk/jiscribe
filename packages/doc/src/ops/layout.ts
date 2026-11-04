import type { Rect } from "@jiscribe/geometry";
import {
	EDGE_END_SPACING,
	LayoutDirections,
	computeLayeredLayout,
	type LayoutDirection,
	type LayoutGraphContainer,
	type LayoutGraphEdge,
	type LayoutGraphNode,
} from "@jiscribe/layout";

import { DocOperationError } from "./errors";
import {
	type EdgeAnchorHandle,
	buildEndpoint,
} from "./utils/connectorEndpoints";
import { requireFiniteNumber } from "./utils/numberArgs";
import {
	type ObjectLocation,
	type ObjectRecord,
	locateObjects,
	readChildren,
	requireObjects,
	visitObjects,
} from "./utils/objectAccess";
import {
	type DocDefinitions,
	getObjectBounds,
	isConnectorObject,
	requireObjectBounds,
	translateObject,
} from "./utils/objectGeometry";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import {
	CONNECTOR_LABEL_DEFAULTS,
	type ConnectorDoc,
} from "../model/objects/connector/ConnectorDoc";
import { GroupFeatures } from "../model/objects/primitives/group/GroupDoc";
import {
	type EndpointRef,
	isConnectPointId,
	toEquivalentEdgeAnchor,
} from "../model/objects/types/EndpointRef";
import { calcTextBlockSize } from "../text/block/calcTextBlockSize";

export type { LayoutDirection } from "@jiscribe/layout";

export type LayoutObjectsParams = {
	/** Which way the flow runs (sources above their targets for `TB`); defaults to `LAYERED_LAYOUT_DEFAULTS` (exported alongside). */
	direction?: LayoutDirection;
	/** Gap in px between neighbours of one rank, 0 or more; defaults to `LAYERED_LAYOUT_DEFAULTS` (exported alongside). */
	nodeSpacing?: number;
	/** Gap in px between one rank and the next, 0 or more; defaults to `LAYERED_LAYOUT_DEFAULTS` (exported alongside). */
	rankSpacing?: number;
};

export type LayoutObjectsResult = {
	/** Ids of the objects that were placed, in the order they were given (or found). */
	nodeIds: string[];
	/** Ids of the containers (groups, and shapes whose type declares `features.container`) sized around their members. */
	containerIds: string[];
	/** Ids of the connectors whose ends were re-anchored or whose routes were rewritten. */
	connectorIds: string[];
};

/** Check the parameters before anything is read, so a bad one changes nothing. */
const requireLayoutParams = (params: LayoutObjectsParams): void => {
	for (const name of ["nodeSpacing", "rankSpacing"] as const) {
		const value = params[name];
		if (value === undefined) {
			continue;
		}
		if (requireFiniteNumber(value, name) < 0) {
			throw new DocOperationError(`${name} must be 0 or more, got ${value}`);
		}
	}
	if (
		params.direction !== undefined &&
		!LayoutDirections.includes(params.direction)
	) {
		throw new DocOperationError(
			`direction must be one of ${LayoutDirections.join(" / ")}, got ${String(params.direction)}`,
		);
	}
};

const readOwnerId = (endpoint: EndpointRef): string | undefined =>
	endpoint.owner?.id;

/**
 * Whether an end sits on a connect point the owner's type declares beyond the four
 * edge midpoints (an ER entity's column), which says where on the owner the line
 * belongs and so is kept as the author set it.
 */
const keepsOwnAnchor = (endpoint: EndpointRef): boolean =>
	endpoint.anchor.kind === "connectPoint" &&
	!isConnectPointId(endpoint.anchor.id);

const centreOf = (bounds: Rect): { x: number; y: number } => ({
	x: bounds.x + bounds.width / 2,
	y: bounds.y + bounds.height / 2,
});

/** Key of one side of one object in the taken-end bookkeeping. */
const sideKey = (ownerId: string, side: EdgeAnchorHandle["side"]): string =>
	`${ownerId}:${side}`;

/**
 * Where ends already sit on each side of each object, as {@link sideKey} → positions
 * along the side; read off the endpoints just written, so a line added afterwards
 * can keep clear of them.
 */
const collectTakenEnds = (
	connectors: readonly ConnectorDoc[],
): Map<string, number[]> => {
	const taken = new Map<string, number[]>();
	const note = (endpoint: EndpointRef): void => {
		const ownerId = readOwnerId(endpoint);
		const edgeAnchor = toEquivalentEdgeAnchor(endpoint.anchor);
		if (ownerId === undefined || edgeAnchor === null) {
			return;
		}
		const key = sideKey(ownerId, edgeAnchor.side);
		const positions = taken.get(key);
		if (positions === undefined) {
			taken.set(key, [edgeAnchor.t]);
		} else {
			positions.push(edgeAnchor.t);
		}
	};
	for (const connector of connectors) {
		note(connector.source);
		note(connector.target);
	}
	return taken;
};

/**
 * The position along a side nearest its midpoint that keeps {@link EDGE_END_SPACING}
 * from every end already there, within a tenth of the side at either end; the
 * midpoint itself when nothing fits.
 */
const findFreeEnd = (
	takenPositions: readonly number[],
	extent: number,
): number => {
	const gap = extent > 0 ? EDGE_END_SPACING / extent : 0;
	const isFree = (t: number): boolean =>
		takenPositions.every((taken) => Math.abs(taken - t) >= gap);
	if (isFree(0.5)) {
		return 0.5;
	}
	for (let step = gap; 0.5 + step <= 0.9; step += gap) {
		if (isFree(0.5 - step)) {
			return 0.5 - step;
		}
		if (isFree(0.5 + step)) {
			return 0.5 + step;
		}
	}
	return 0.5;
};

/** The midpoints of the sides of two boxes that face each other, by the larger offset between their centres. */
const calcFacingEdgeAnchors = (
	source: Rect,
	target: Rect,
): { source: EdgeAnchorHandle; target: EdgeAnchorHandle } => {
	const deltaX = centreOf(target).x - centreOf(source).x;
	const deltaY = centreOf(target).y - centreOf(source).y;
	if (Math.abs(deltaX) >= Math.abs(deltaY)) {
		return deltaX >= 0
			? { source: { side: "right", t: 0.5 }, target: { side: "left", t: 0.5 } }
			: { source: { side: "left", t: 0.5 }, target: { side: "right", t: 0.5 } };
	}
	return deltaY >= 0
		? { source: { side: "bottom", t: 0.5 }, target: { side: "top", t: 0.5 } }
		: { source: { side: "top", t: 0.5 }, target: { side: "bottom", t: 0.5 } };
};

/** A shape whose type declares itself a container other objects sit inside (`features.container`). */
const isContainerShape = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): boolean => definitions.get(object.type)?.features.container !== undefined;

/** Room the container's type keeps for its title band; a group has none. */
const readTitleHeight = (
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
type PlacedNode = {
	object: ObjectRecord;
	bounds: Rect;
	groupId?: string;
	parentId?: string;
};

/**
 * A group (members: its children) or a container shape (members: what lies inside it).
 * `bounds` is the container shape's own box, or the box a group's children occupy.
 */
type PlacedContainer = {
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
 */
const collectPlacements = (
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
	// smallest container around a box is its parent. Containers first, so a container
	// inside a nested container is adopted by the inner one at the inner one's level
	// rather than by both.
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
	for (const container of [...containers].sort((a, b) => area(a) - area(b))) {
		adopt(container);
	}
	for (const node of nodes) {
		adopt(node);
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

/** The box a connector's label is drawn in (see calcTextBlockSize), or undefined without a label. */
const measureLabelBox = (
	connector: ConnectorDoc,
): { width: number; height: number } | undefined => {
	const { label } = connector;
	if (label === undefined || label.text === "") {
		return undefined;
	}
	const border = (label.strokeWidth ?? 0) * 2;
	const { width, height } = calcTextBlockSize(label.text, {
		fontSize: label.fontSize ?? CONNECTOR_LABEL_DEFAULTS.fontSize,
		fontFamily: label.fontFamily ?? CONNECTOR_LABEL_DEFAULTS.fontFamily,
		fontWeight: label.fontWeight ?? CONNECTOR_LABEL_DEFAULTS.fontWeight,
	});
	return { width: width + border, height: height + border };
};

/**
 * Arrange objects as a layered graph, mutating `doc` in place: the connectors between
 * them decide the ranks (a source sits above, or left of, its targets), nodes of one rank
 * are ordered to reduce crossings, and every connector between two placed objects is
 * re-anchored onto the sides that now face each other (an edge anchor, placed toward where
 * the connector goes so several on one side fan out), with a right-angled route around the
 * objects in between written as its corners (none when it runs straight). A labelled
 * connector gets room for its label, which is moved onto the line at that spot. The
 * arrangement keeps the top-left corner the objects occupied together, so the drawing
 * stays where it was.
 *
 * @param doc - Mutated in place
 * @param ids - Objects to place; omitted means every top-level object the build can
 *   measure. Connectors among them are skipped (they follow their ends), and an object
 *   named together with a group it sits in counts once. A group is a container around its
 *   children, and a shape whose type declares `features.container` (a VPC, a subsystem
 *   boundary) is a container around the objects lying inside it when the call is made,
 *   so to lay out a container shape's contents name the contents as well: members are laid
 *   out inside their container, and a container shape is moved and resized to the box the
 *   layout draws around them; one holding nothing is placed as a box of its own. A
 *   connector with an end on a container shape is no edge of the graph, but is redrawn
 *   between the facing sides afterwards. An end on a connect point the owner's type
 *   declares (an ER entity's column) stays there, and that connector's route is left to
 *   the engine, as is a self loop's
 * @param params - Direction and gaps; see {@link LayoutObjectsParams}
 * @param definitions - Type table `features.geometry`, `features.container` and the
 *   offered connect points are read from
 * @returns Which objects moved, which containers were sized around them, and which
 *   connectors were re-anchored or rerouted
 * @throws {@link DocOperationError} for a spacing that is not a finite number of 0 or
 *   more, a direction outside `LayoutDirections`, fewer than 2 placeable objects, an id
 *   that is missing, or a named object with no position of its own — before anything is
 *   moved
 */
export const layoutObjects = (
	doc: CanvasDoc,
	ids: readonly string[] | undefined,
	params: LayoutObjectsParams,
	definitions: DocDefinitions,
): LayoutObjectsResult => {
	requireLayoutParams(params);
	const candidates: ObjectRecord[] =
		ids === undefined
			? (doc.root as ObjectRecord[])
			: requireObjects(doc, [...new Set(ids)]).map(({ object }) => object);
	const { nodes: measured, containers } = collectPlacements(
		candidates,
		definitions,
		ids === undefined,
	);
	if (measured.length < 2) {
		throw new DocOperationError(
			`layout needs at least 2 objects to place, got ${measured.length}`,
		);
	}
	const nodeIds = new Set(measured.map(({ object }) => object.id));

	// Every connector in the document whose both ends sit on placed objects is an edge,
	// wherever the connector itself lives; a self loop is no edge, but is rerouted.
	const connectors: ConnectorDoc[] = [];
	const selfLoops: ConnectorDoc[] = [];
	visitObjects(doc.root, (object) => {
		if (!isConnectorObject(object)) {
			return;
		}
		const connector = object as unknown as ConnectorDoc;
		const sourceId = readOwnerId(connector.source);
		const targetId = readOwnerId(connector.target);
		if (
			sourceId === undefined ||
			targetId === undefined ||
			!nodeIds.has(sourceId) ||
			!nodeIds.has(targetId)
		) {
			return;
		}
		(sourceId === targetId ? selfLoops : connectors).push(connector);
	});

	const graphNodes: LayoutGraphNode[] = measured.map(
		({ object, bounds, parentId }) => ({
			id: object.id,
			width: bounds.width,
			height: bounds.height,
			...(parentId !== undefined ? { parentId } : {}),
		}),
	);
	const graphContainers: LayoutGraphContainer[] = containers.map(
		({ object, parentId }) => ({
			id: object.id,
			...(parentId !== undefined ? { parentId } : {}),
			titleHeight: readTitleHeight(object, definitions),
		}),
	);
	const graphEdges: LayoutGraphEdge[] = connectors.map((connector) => {
		const label = measureLabelBox(connector);
		return {
			id: connector.id,
			sourceId: readOwnerId(connector.source) as string,
			targetId: readOwnerId(connector.target) as string,
			...(label !== undefined ? { label } : {}),
		};
	});
	const laidOut = computeLayeredLayout(
		graphNodes,
		graphEdges,
		params,
		graphContainers,
	);

	// Resolve every endpoint before any write, so an owner that does not offer the
	// connect point leaves the document untouched.
	const locatedOwners: ReadonlyMap<string, ObjectLocation> = locateObjects(
		doc,
		nodeIds,
	);
	const connectorById = new Map(
		connectors.map((connector) => [connector.id, connector] as const),
	);
	const endpointWrites = laidOut.edges.map((edge) => {
		const connector = connectorById.get(edge.id) as ConnectorDoc;
		const sourceKept = keepsOwnAnchor(connector.source);
		const targetKept = keepsOwnAnchor(connector.target);
		return {
			connector,
			// An end on a declared connect point stays there; the line is then routed
			// by the engine, since the corners here were made for the end the layout chose.
			keepsRoute: !(sourceKept || targetKept),
			source: sourceKept
				? connector.source
				: buildEndpoint(
						locatedOwners,
						readOwnerId(connector.source) as string,
						edge.source,
						definitions,
					),
			target: targetKept
				? connector.target
				: buildEndpoint(
						locatedOwners,
						readOwnerId(connector.target) as string,
						edge.target,
						definitions,
					),
		};
	});

	const containerShapes = containers.filter(({ isShape }) => isShape);
	const everyBox = [...measured, ...containerShapes].map(
		({ bounds }) => bounds,
	);
	const originX = Math.min(...everyBox.map((bounds) => bounds.x));
	const originY = Math.min(...everyBox.map((bounds) => bounds.y));
	const boundsById = new Map(
		measured.map(({ object, bounds }) => [object.id, bounds] as const),
	);
	const objectById = new Map(
		measured.map(({ object }) => [object.id, object] as const),
	);
	// Every coordinate written lands on a whole pixel, the nodes' as well as the
	// corners', so a route's straight stretches stay straight.
	for (const { id, bounds } of laidOut.nodes) {
		const before = boundsById.get(id) as Rect;
		translateObject(
			objectById.get(id) as ObjectRecord,
			Math.round(originX + bounds.x) - before.x,
			Math.round(originY + bounds.y) - before.y,
			definitions,
		);
	}
	// A container shape takes the box the layout drew around its members, moved and
	// resized when its geometry is a rect's; a group has no box of its own and simply
	// follows its children.
	const laidOutContainerById = new Map(
		laidOut.containers.map(
			(container) => [container.id, container.bounds] as const,
		),
	);
	for (const { object, bounds: before } of containerShapes) {
		const bounds = laidOutContainerById.get(object.id);
		if (bounds === undefined) {
			continue;
		}
		if (definitions.get(object.type)?.features.geometry === "rect") {
			object.x = Math.round(originX + bounds.x);
			object.y = Math.round(originY + bounds.y);
			object.width = Math.round(bounds.width);
			object.height = Math.round(bounds.height);
		} else {
			translateObject(
				object,
				Math.round(originX + bounds.x) - before.x,
				Math.round(originY + bounds.y) - before.y,
				definitions,
			);
		}
	}
	const laidOutEdgeById = new Map(
		laidOut.edges.map((edge) => [edge.id, edge] as const),
	);
	for (const { connector, source, target, keepsRoute } of endpointWrites) {
		const laidOutEdge = laidOutEdgeById.get(connector.id);
		connector.source = source;
		connector.target = target;
		connector.points = keepsRoute
			? (laidOutEdge?.points ?? []).map(({ x, y }) => ({
					x: Math.round(originX + x),
					y: Math.round(originY + y),
				}))
			: [];
		if (
			keepsRoute &&
			connector.label !== undefined &&
			laidOutEdge?.labelPosition !== undefined
		) {
			// On the line where the layout found room for it, beside the line when the
			// route is too short to hold it anywhere.
			connector.label.position = laidOutEdge.labelPosition;
			connector.label.offset = laidOutEdge.labelOffset ?? 0;
		}
		// A straight line is what a centre anchor defaults to; between the facing sides
		// the arrangement was made for, the right-angled route is the one that reads.
		delete connector.routing;
	}
	// A self loop keeps its ends; its stored corners belong to where the owner was.
	for (const connector of selfLoops) {
		connector.points = [];
		delete connector.routing;
	}

	// A connector with an end on a container shape is no edge of the graph, but it is
	// redrawn between the facing sides of where the container and its other end ended up,
	// clear of the ends already on those sides, its route left to the engine. An end on
	// a declared connect point stays there as above.
	const containerShapeIds = new Set(
		containerShapes.map(({ object }) => object.id),
	);
	const placedById = new Map(
		[...measured, ...containerShapes].map(
			({ object }) => [object.id, object] as const,
		),
	);
	const boxOf = (id: string): Rect | undefined => {
		const object = placedById.get(id);
		return object === undefined
			? undefined
			: requireObjectBounds(object, definitions);
	};
	const locatedContainerOwners = locateObjects(
		doc,
		new Set([...nodeIds, ...containerShapeIds]),
	);
	const containerConnectorIds: string[] = [];
	const takenEnds = collectTakenEnds(
		endpointWrites.map(({ connector }) => connector),
	);
	const placeEnd = (
		ownerId: string,
		handle: EdgeAnchorHandle,
		box: Rect,
	): EdgeAnchorHandle => {
		const key = sideKey(ownerId, handle.side);
		const extent =
			handle.side === "top" || handle.side === "bottom"
				? box.width
				: box.height;
		const positions = takenEnds.get(key) ?? [];
		const t = findFreeEnd(positions, extent);
		positions.push(t);
		takenEnds.set(key, positions);
		return { side: handle.side, t };
	};
	visitObjects(doc.root, (object) => {
		if (!isConnectorObject(object)) {
			return;
		}
		const connector = object as unknown as ConnectorDoc;
		const sourceId = readOwnerId(connector.source);
		const targetId = readOwnerId(connector.target);
		if (
			sourceId === undefined ||
			targetId === undefined ||
			!(containerShapeIds.has(sourceId) || containerShapeIds.has(targetId))
		) {
			return;
		}
		const sourceBox = boxOf(sourceId);
		const targetBox = boxOf(targetId);
		if (sourceBox === undefined || targetBox === undefined) {
			return;
		}
		const sides = calcFacingEdgeAnchors(sourceBox, targetBox);
		if (!keepsOwnAnchor(connector.source)) {
			connector.source = buildEndpoint(
				locatedContainerOwners,
				sourceId,
				placeEnd(sourceId, sides.source, sourceBox),
				definitions,
			);
		}
		if (!keepsOwnAnchor(connector.target)) {
			connector.target = buildEndpoint(
				locatedContainerOwners,
				targetId,
				placeEnd(targetId, sides.target, targetBox),
				definitions,
			);
		}
		connector.points = [];
		delete connector.routing;
		containerConnectorIds.push(connector.id);
	});

	return {
		nodeIds: measured.map(({ object }) => object.id),
		containerIds: containers.map(({ object }) => object.id),
		connectorIds: [
			...endpointWrites.map(({ connector }) => connector.id),
			...selfLoops.map(({ id }) => id),
			...containerConnectorIds,
		],
	};
};

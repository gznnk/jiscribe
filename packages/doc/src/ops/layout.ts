import type { Rect } from "@jiscribe/geometry";
import {
	LayoutDirections,
	calcFacingSides,
	computeLayeredLayout,
	createTakenEnds,
	type LaidOutEdge,
	type LayeredLayoutResult,
	type LayoutDirection,
	type LayoutGraphContainer,
	type LayoutGraphEdge,
	type LayoutGraphNode,
	type TakenEnd,
} from "@jiscribe/layout";

import { DocOperationError } from "./errors";
import { buildEndpoint } from "./utils/connectorEndpoints";
import { readOwnerId } from "./utils/layoutConnectorEnds";
import {
	type PlacedContainer,
	type PlacedNode,
	collectPlacements,
} from "./utils/layoutPlacements";
import { requireFiniteNumber } from "./utils/numberArgs";
import {
	type ObjectRecord,
	locateObjects,
	requireObjects,
	visitObjects,
} from "./utils/objectAccess";
import {
	type DocDefinitions,
	isConnectorObject,
	requireObjectBounds,
	translateObject,
} from "./utils/objectGeometry";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import {
	CONNECTOR_LABEL_DEFAULTS,
	type ConnectorDoc,
} from "../model/objects/connector/ConnectorDoc";
import {
	isOnDeclaredConnectPoint,
	listEdgeAnchoredEnds,
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
	/** Ids of the containers (groups, and shapes whose type declares `container`) sized around their members. */
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
 * Every connector in the document whose both ends sit on placed objects, wherever
 * the connector itself lives, split into the edges of the graph and the self loops,
 * which are no edge but are rerouted all the same.
 */
const collectConnectors = (
	doc: CanvasDoc,
	nodeIds: ReadonlySet<string>,
): { edges: ConnectorDoc[]; selfLoops: ConnectorDoc[] } => {
	const edges: ConnectorDoc[] = [];
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
		(sourceId === targetId ? selfLoops : edges).push(connector);
	});
	return { edges, selfLoops };
};

/** The graph as the layout takes it, built from the placements and the connectors between them. */
const buildGraph = (
	nodes: readonly PlacedNode[],
	containers: readonly PlacedContainer[],
	edges: readonly ConnectorDoc[],
): {
	nodes: LayoutGraphNode[];
	containers: LayoutGraphContainer[];
	edges: LayoutGraphEdge[];
} => ({
	nodes: nodes.map(({ object, bounds, parentId }) => ({
		id: object.id,
		width: bounds.width,
		height: bounds.height,
		...(parentId !== undefined ? { parentId } : {}),
	})),
	containers: containers.map(({ object, parentId, titleHeight }) => ({
		id: object.id,
		...(parentId !== undefined ? { parentId } : {}),
		titleHeight,
	})),
	edges: edges.map((connector) => {
		const label = measureLabelBox(connector);
		return {
			id: connector.id,
			sourceId: readOwnerId(connector.source) as string,
			targetId: readOwnerId(connector.target) as string,
			...(label !== undefined ? { label } : {}),
		};
	}),
});

/**
 * Move every node, and every container shape, to where the layout put it. Every
 * coordinate written lands on a whole pixel, the nodes' as well as the corners', so a
 * route's straight stretches stay straight. A container shape takes the box the layout
 * drew around its members, resized when its geometry is a rect's and moved whole
 * otherwise; a group has no box of its own and simply follows its children.
 *
 * @param origin - The top-left the objects occupied together, which the drawing keeps
 */
const writePlacements = (
	laidOut: LayeredLayoutResult,
	nodes: readonly PlacedNode[],
	containerShapes: readonly PlacedContainer[],
	origin: { x: number; y: number },
	definitions: DocDefinitions,
): void => {
	const placedById = new Map(
		[...nodes, ...containerShapes].map((placed) => [placed.object.id, placed]),
	);
	for (const { id, bounds } of laidOut.nodes) {
		const { object, bounds: before } = placedById.get(id) as PlacedNode;
		translateObject(
			object,
			Math.round(origin.x + bounds.x) - before.x,
			Math.round(origin.y + bounds.y) - before.y,
			definitions,
		);
	}
	for (const { id, bounds } of laidOut.containers) {
		const placed = placedById.get(id);
		if (placed === undefined) {
			continue;
		}
		const { object, bounds: before } = placed;
		if (definitions.get(object.type)?.features.geometry === "rect") {
			object.x = Math.round(origin.x + bounds.x);
			object.y = Math.round(origin.y + bounds.y);
			object.width = Math.round(bounds.width);
			object.height = Math.round(bounds.height);
		} else {
			translateObject(
				object,
				Math.round(origin.x + bounds.x) - before.x,
				Math.round(origin.y + bounds.y) - before.y,
				definitions,
			);
		}
	}
};

/** A connector's new ends, resolved before anything is written, and whether its route is the layout's to write. */
type ConnectorWrite = {
	connector: ConnectorDoc;
	laidOutEdge: LaidOutEdge;
	source: ConnectorDoc["source"];
	target: ConnectorDoc["target"];
	/**
	 * False when an end stays on a declared connect point: the corners the layout made
	 * were for the end it chose, so the route is then left to the engine.
	 */
	keepsRoute: boolean;
};

/**
 * Give every edge its new ends and route. The ends are resolved first, so an owner
 * that does not offer the connect point leaves the document untouched.
 *
 * @returns The connectors written, in the layout's order
 */
const writeRoutes = (
	doc: CanvasDoc,
	laidOutEdges: readonly LaidOutEdge[],
	edges: readonly ConnectorDoc[],
	nodeIds: ReadonlySet<string>,
	origin: { x: number; y: number },
	definitions: DocDefinitions,
): ConnectorDoc[] => {
	const locatedOwners = locateObjects(doc, nodeIds);
	const connectorById = new Map(
		edges.map((connector) => [connector.id, connector] as const),
	);
	const writes: ConnectorWrite[] = laidOutEdges.map((laidOutEdge) => {
		const connector = connectorById.get(laidOutEdge.id) as ConnectorDoc;
		const sourceKept = isOnDeclaredConnectPoint(connector.source);
		const targetKept = isOnDeclaredConnectPoint(connector.target);
		return {
			connector,
			laidOutEdge,
			keepsRoute: !(sourceKept || targetKept),
			source: sourceKept
				? connector.source
				: buildEndpoint(
						locatedOwners,
						readOwnerId(connector.source) as string,
						laidOutEdge.source,
						definitions,
					),
			target: targetKept
				? connector.target
				: buildEndpoint(
						locatedOwners,
						readOwnerId(connector.target) as string,
						laidOutEdge.target,
						definitions,
					),
		};
	});
	for (const { connector, source, target, keepsRoute, laidOutEdge } of writes) {
		connector.source = source;
		connector.target = target;
		connector.points = keepsRoute
			? laidOutEdge.points.map(({ x, y }) => ({
					x: Math.round(origin.x + x),
					y: Math.round(origin.y + y),
				}))
			: [];
		if (
			keepsRoute &&
			connector.label !== undefined &&
			laidOutEdge.labelPosition !== undefined
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
	return writes.map(({ connector }) => connector);
};

/**
 * Redraw every connector with an end on a container shape: no edge of the graph, it
 * is re-anchored between the facing sides of where the container and its other end
 * ended up, clear of the ends already on those sides, its route left to the engine.
 * An end on a declared connect point stays there, as in writeRoutes.
 *
 * @param written - The connectors writeRoutes handled, whose ends are the ones to keep clear of
 * @returns The ids of the connectors redrawn
 */
const redrawContainerConnectors = (
	doc: CanvasDoc,
	nodes: readonly PlacedNode[],
	containerShapes: readonly PlacedContainer[],
	written: readonly ConnectorDoc[],
	definitions: DocDefinitions,
): string[] => {
	const containerShapeIds = new Set(
		containerShapes.map(({ object }) => object.id),
	);
	const placedById = new Map(
		[...nodes, ...containerShapes].map(
			({ object }) => [object.id, object] as const,
		),
	);
	const boxOf = (id: string): Rect | undefined => {
		const object = placedById.get(id);
		return object === undefined
			? undefined
			: requireObjectBounds(object, definitions);
	};
	const locatedOwners = locateObjects(doc, new Set(placedById.keys()));
	const writtenEnds: TakenEnd[] = listEdgeAnchoredEnds(written);
	const takenEnds = createTakenEnds(writtenEnds);
	const redrawnIds: string[] = [];
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
		const sides = calcFacingSides(sourceBox, targetBox);
		if (!isOnDeclaredConnectPoint(connector.source)) {
			connector.source = buildEndpoint(
				locatedOwners,
				sourceId,
				takenEnds.place(sourceId, sides.source.side, sourceBox),
				definitions,
			);
		}
		if (!isOnDeclaredConnectPoint(connector.target)) {
			connector.target = buildEndpoint(
				locatedOwners,
				targetId,
				takenEnds.place(targetId, sides.target.side, targetBox),
				definitions,
			);
		}
		connector.points = [];
		delete connector.routing;
		redrawnIds.push(connector.id);
	});
	return redrawnIds;
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
 *   children, and a shape whose type declares `container` (a VPC, a subsystem
 *   boundary) is a container around the objects lying inside it when the call is made,
 *   so to lay out a container shape's contents name the contents as well: members are laid
 *   out inside their container, and a container shape is moved and resized to the box the
 *   layout draws around them; one holding nothing is placed as a box of its own. A
 *   connector with an end on a container shape is no edge of the graph, but is redrawn
 *   between the facing sides afterwards. An end on a connect point the owner's type
 *   declares (an ER entity's column) stays there, and that connector's route is left to
 *   the engine, as is a self loop's
 * @param params - Direction and gaps; see {@link LayoutObjectsParams}
 * @param definitions - Type table `features.geometry`, `container` (and the title band
 *   it answers for each object) and the offered connect points are read from
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
	const { nodes, containers } = collectPlacements(
		candidates,
		definitions,
		ids === undefined,
	);
	if (nodes.length < 2) {
		throw new DocOperationError(
			`layout needs at least 2 objects to place, got ${nodes.length}`,
		);
	}
	const nodeIds = new Set(nodes.map(({ object }) => object.id));
	const { edges, selfLoops } = collectConnectors(doc, nodeIds);

	const graph = buildGraph(nodes, containers, edges);
	const laidOut = computeLayeredLayout(
		graph.nodes,
		graph.edges,
		params,
		graph.containers,
	);

	const containerShapes = containers.filter(({ isShape }) => isShape);
	const everyBox = [...nodes, ...containerShapes].map(({ bounds }) => bounds);
	const origin = {
		x: Math.min(...everyBox.map((bounds) => bounds.x)),
		y: Math.min(...everyBox.map((bounds) => bounds.y)),
	};
	// The routes' ends are resolved before any write (see writeRoutes), and come first
	// so a failure leaves the nodes where they were as well.
	const written = writeRoutes(
		doc,
		laidOut.edges,
		edges,
		nodeIds,
		origin,
		definitions,
	);
	writePlacements(laidOut, nodes, containerShapes, origin, definitions);
	// A self loop keeps its ends; its stored corners belong to where the owner was.
	for (const connector of selfLoops) {
		connector.points = [];
		delete connector.routing;
	}
	const redrawnIds = redrawContainerConnectors(
		doc,
		nodes,
		containerShapes,
		written,
		definitions,
	);

	return {
		nodeIds: nodes.map(({ object }) => object.id),
		containerIds: containers.map(({ object }) => object.id),
		connectorIds: [
			...written.map(({ id }) => id),
			...selfLoops.map(({ id }) => id),
			...redrawnIds,
		],
	};
};

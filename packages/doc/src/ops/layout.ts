import type { Rect } from "@jiscribe/geometry";
import {
	LayoutDirections,
	calcFacingSides,
	computeLayeredLayout,
	createTakenEnds,
	type LaidOutEdge,
	type LayeredLayoutResult,
	type LayoutDirection,
	type LayoutEdgeAnchor,
	type LayoutGraphContainer,
	type LayoutGraphEdge,
	type LayoutGraphNode,
	type LayoutSide,
	type LayoutVisualMargin,
	type TakenEnd,
} from "@jiscribe/layout";

import { DocOperationError } from "./errors";
import { buildEndpoint } from "./utils/connectorEndpoints";
import {
	readLayoutAnchorRanges,
	readLayoutAnchorBodyRanges,
	resolveLayoutAnchorShape,
} from "./utils/layoutAnchorShapes";
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
	readChildren,
	requireObjects,
	visitObjects,
} from "./utils/objectAccess";
import {
	type DocDefinitions,
	isConnectorObject,
	readBodyTextStyleDefaults,
	requireObjectBounds,
	translateObject,
} from "./utils/objectGeometry";
import { isTransformed } from "./utils/transformFields";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../model/objects/base/ObjectDoc";
import type { EdgeAnchorOutlineShape } from "../model/objects/connector/calcEdgeAnchorOutlineRange";
import {
	CONNECTOR_LABEL_DEFAULTS,
	type ConnectorDoc,
} from "../model/objects/connector/ConnectorDoc";
import {
	toAnchorRegionSidePosition,
	toBoxSidePosition,
} from "../model/objects/connector/convertEdgeAnchorRatio";
import {
	isOnDeclaredConnectPoint,
	listEdgeAnchoredEnds,
} from "../model/objects/types/EndpointRef";
import { isRichText } from "../model/objects/types/text/RichText";
import type { TextSlot } from "../model/objects/types/text/TextSlot";
import {
	type RestackBeneathRequest,
	restackBeneath,
} from "../model/objects/utils/restackBeneath";
import { sortEdgesByEndOrder } from "../model/objects/utils/sortEdgesByEndOrder";
import { calcTextBlockSize } from "../text/block/calcTextBlockSize";
import {
	type ConnectorUnderLabelText,
	calcLabelTextLayoutMargin,
	listConnectorsUnderLabelText,
} from "../text/label/calcLabelTextLayoutMargin";

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
	/** Ids of the containers (groups, and shapes whose type declares `layoutContainer`) sized around their members. */
	containerIds: string[];
	/** Ids of the connectors whose ends were re-anchored or whose routes were rewritten. */
	connectorIds: string[];
	/**
	 * Ids of the connectors moved back in the stacking order, each to just beneath a
	 * shape whose caption it runs under (see planLabelTextRestack), each parent's in the
	 * order they stood before.
	 */
	restackedConnectorIds: string[];
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

/**
 * What the object draws past its box, which the layout keeps room for: a `"label"`
 * type's caption (calcLabelTextLayoutMargin), measured in the font it is drawn with.
 *
 * @param bounds - The object's box as the layout is given it
 */
const readLayoutVisualMargin = (
	object: ObjectRecord,
	bounds: Rect,
	definitions: DocDefinitions,
): LayoutVisualMargin | undefined => {
	const definition = definitions.get(object.type);
	return definition === undefined
		? undefined
		: calcLabelTextLayoutMargin(
				definition.features.text,
				bounds,
				isRichText(object.text) ? (object as Partial<TextSlot>) : undefined,
				readBodyTextStyleDefaults(definition),
				isTransformed(object),
			);
};

/**
 * The graph as the layout takes it, built from the placements and the connectors
 * between them; each node carries the stretch of its sides its outline reaches along,
 * the stretch its anchor region covers, and what it draws past its box.
 */
const buildGraph = (
	nodes: readonly PlacedNode[],
	containers: readonly PlacedContainer[],
	edges: readonly ConnectorDoc[],
	definitions: DocDefinitions,
): {
	nodes: LayoutGraphNode[];
	containers: LayoutGraphContainer[];
	edges: LayoutGraphEdge[];
} => ({
	nodes: nodes.map(({ object, bounds, parentId }) => {
		const shape = resolveLayoutAnchorShape(object, bounds, definitions);
		const anchorRanges = readLayoutAnchorRanges(object, shape);
		const anchorBodyRanges = readLayoutAnchorBodyRanges(shape);
		const visualMargin = readLayoutVisualMargin(object, bounds, definitions);
		return {
			id: object.id,
			width: bounds.width,
			height: bounds.height,
			...(parentId !== undefined ? { parentId } : {}),
			...(anchorRanges !== undefined ? { anchorRanges } : {}),
			...(anchorBodyRanges !== undefined ? { anchorBodyRanges } : {}),
			...(visualMargin !== undefined ? { visualMargin } : {}),
		};
	}),
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

/**
 * Whether the layout writes the connector's route: not when an end stays on a declared
 * connect point, since the corners the layout made were for the end it chose, so the
 * route is then left to the engine.
 */
const isLayoutRouteWritten = (connector: ConnectorDoc): boolean =>
	!(
		isOnDeclaredConnectPoint(connector.source) ||
		isOnDeclaredConnectPoint(connector.target)
	);

/** A connector's new ends, resolved before anything is written, and whether its route is the layout's to write. */
type ConnectorWrite = {
	connector: ConnectorDoc;
	laidOutEdge: LaidOutEdge;
	source: ConnectorDoc["source"];
	target: ConnectorDoc["target"];
	/** See isLayoutRouteWritten. */
	keepsRoute: boolean;
};

/**
 * Give every edge its new ends and route. The ends are resolved first, so an owner
 * that does not offer the connect point leaves the document untouched. An end is
 * written as a ratio of its owner's anchor region, where the layout chose it as one
 * of the box.
 *
 * @returns The connectors written, in the layout's order
 */
const writeRoutes = (
	doc: CanvasDoc,
	laidOutEdges: readonly LaidOutEdge[],
	edges: readonly ConnectorDoc[],
	nodes: readonly PlacedNode[],
	origin: { x: number; y: number },
	definitions: DocDefinitions,
): ConnectorDoc[] => {
	const nodeIds = new Set(nodes.map(({ object }) => object.id));
	const locatedOwners = locateObjects(doc, nodeIds);
	const connectorById = new Map(
		edges.map((connector) => [connector.id, connector] as const),
	);
	const placedById = new Map(
		nodes.map((placed) => [placed.object.id, placed] as const),
	);
	const toStoredAnchor = (
		ownerId: string,
		anchor: LaidOutEdge["source"],
	): LaidOutEdge["source"] => {
		const { object, bounds } = placedById.get(ownerId) as PlacedNode;
		return toAnchorRegionSidePosition(
			anchor,
			resolveLayoutAnchorShape(object, bounds, definitions),
		);
	};
	const writes: ConnectorWrite[] = laidOutEdges.map((laidOutEdge) => {
		const connector = connectorById.get(laidOutEdge.id) as ConnectorDoc;
		const sourceKept = isOnDeclaredConnectPoint(connector.source);
		const targetKept = isOnDeclaredConnectPoint(connector.target);
		return {
			connector,
			laidOutEdge,
			keepsRoute: isLayoutRouteWritten(connector),
			source: sourceKept
				? connector.source
				: buildEndpoint(
						locatedOwners,
						readOwnerId(connector.source) as string,
						toStoredAnchor(
							readOwnerId(connector.source) as string,
							laidOutEdge.source,
						),
						definitions,
					),
			target: targetKept
				? connector.target
				: buildEndpoint(
						locatedOwners,
						readOwnerId(connector.target) as string,
						toStoredAnchor(
							readOwnerId(connector.target) as string,
							laidOutEdge.target,
						),
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
 * Where restacking takes the connectors the layout routed under a caption: each to
 * just beneath that shape, within its own parent, beneath the shape or the group
 * holding it there (restackBeneath), so the caption, knocking out what lies behind it,
 * reads over the line. Nothing is moved yet (see applyLabelTextRestack).
 */
type LabelTextRestack = {
	/** Each parent's children in their new order, for the parents whose order changes. */
	orderedIdsBySiblings: Map<ObjectDoc[], string[]>;
	/** The connectors moved, parent by parent, each parent's in the order they stood. */
	movedIds: string[];
};

/** Where restacking takes the connectors given, with the owners each runs under the caption of. */
const planLabelTextRestack = (
	doc: CanvasDoc,
	connectors: readonly ConnectorUnderLabelText[],
): LabelTextRestack => {
	const restack: LabelTextRestack = {
		orderedIdsBySiblings: new Map(),
		movedIds: [],
	};
	if (connectors.length === 0) {
		return restack;
	}
	const parentIdById = new Map<string, string>();
	const siblingsById = new Map<string, ObjectDoc[]>();
	const walk = (siblings: ObjectDoc[], parentId: string | undefined): void => {
		for (const object of siblings) {
			if (siblingsById.has(object.id)) {
				continue;
			}
			siblingsById.set(object.id, siblings);
			if (parentId !== undefined) {
				parentIdById.set(object.id, parentId);
			}
			walk(readChildren(object), object.id);
		}
	};
	walk(doc.root, undefined);
	const pathFrom = (id: string): string[] => {
		const path = [id];
		for (
			let parentId = parentIdById.get(id);
			parentId !== undefined;
			parentId = parentIdById.get(parentId)
		) {
			path.push(parentId);
		}
		return path;
	};
	const requestsBySiblings = new Map<ObjectDoc[], RestackBeneathRequest[]>();
	for (const { connectorId, ownerIds } of connectors) {
		const siblings = siblingsById.get(connectorId);
		if (siblings === undefined) {
			continue;
		}
		const request = { id: connectorId, beneathPaths: ownerIds.map(pathFrom) };
		const parentRequests = requestsBySiblings.get(siblings);
		if (parentRequests === undefined) {
			requestsBySiblings.set(siblings, [request]);
		} else {
			parentRequests.push(request);
		}
	}
	for (const [siblings, parentRequests] of requestsBySiblings) {
		const { orderedIds, movedIds } = restackBeneath(
			siblings.map(({ id }) => id),
			parentRequests,
		);
		if (movedIds.length > 0) {
			restack.orderedIdsBySiblings.set(siblings, orderedIds);
			restack.movedIds.push(...movedIds);
		}
	}
	return restack;
};

/** One parent's children in the order `restack` leaves them, as a new array. */
const readRestackedSiblings = (
	siblings: ObjectDoc[],
	restack: LabelTextRestack,
): ObjectDoc[] => {
	const orderedIds = restack.orderedIdsBySiblings.get(siblings);
	if (orderedIds === undefined) {
		return [...siblings];
	}
	const objectById = new Map(siblings.map((object) => [object.id, object]));
	return orderedIds.map((id) => objectById.get(id) as ObjectDoc);
};

/** Move the connectors where `restack` takes them, mutating the doc's parent arrays in place. */
const applyLabelTextRestack = (restack: LabelTextRestack): void => {
	for (const siblings of restack.orderedIdsBySiblings.keys()) {
		siblings.splice(
			0,
			siblings.length,
			...readRestackedSiblings(siblings, restack),
		);
	}
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
	// Read on the boxes as the placements left them: a container shape was resized.
	const shapeOf = (id: string, box: Rect): EdgeAnchorOutlineShape =>
		resolveLayoutAnchorShape(
			placedById.get(id) as ObjectRecord,
			box,
			definitions,
		);
	const locatedOwners = locateObjects(doc, new Set(placedById.keys()));
	// The ends are stored as ratios of the anchor region; the free spots are found on the box.
	const writtenEnds: TakenEnd[] = listEdgeAnchoredEnds(written).map((end) => {
		const box = boxOf(end.ownerId);
		return box === undefined
			? end
			: toBoxSidePosition(end, shapeOf(end.ownerId, box));
	});
	const takenEnds = createTakenEnds(writtenEnds);
	const placeEnd = (
		ownerId: string,
		side: LayoutSide,
		box: Rect,
	): LayoutEdgeAnchor => {
		const object = placedById.get(ownerId) as ObjectRecord;
		const shape = shapeOf(ownerId, box);
		return toAnchorRegionSidePosition(
			takenEnds.place(
				ownerId,
				side,
				box,
				readLayoutAnchorRanges(object, shape)?.[side],
				readLayoutAnchorBodyRanges(shape)?.[side],
			),
			shape,
		);
	};
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
				placeEnd(sourceId, sides.source.side, sourceBox),
				definitions,
			);
		}
		if (!isOnDeclaredConnectPoint(connector.target)) {
			connector.target = buildEndpoint(
				locatedOwners,
				targetId,
				placeEnd(targetId, sides.target.side, targetBox),
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
 * the connector goes so several on one side fan out, and kept where the owner's outline
 * reaches along the side), with a right-angled route around the
 * objects in between written as its corners (none when it runs straight). A labelled
 * connector gets room for its label, which is moved onto the line at that spot. A shape
 * hanging a caption below its box (`features.text: "label"`) takes the caption's room
 * as well; a connector whose route runs through its own end's caption is moved to just
 * beneath that shape in the stacking order, so the caption reads over the line. The
 * arrangement keeps the top-left corner the objects' boxes occupied together, so the
 * drawing stays where it was.
 *
 * @param doc - Mutated in place
 * @param ids - Objects to place; omitted means every top-level object the build can
 *   measure. Connectors among them are skipped (they follow their ends), and an object
 *   named together with a group it sits in counts once. A group is a container around its
 *   children, and a shape whose type declares `layoutContainer` (a VPC, a subsystem
 *   boundary) is a container around the objects lying inside it when the call is made,
 *   so to lay out a container shape's contents name the contents as well: members are laid
 *   out inside their container, and a container shape is moved and resized to the box the
 *   layout draws around them; one holding nothing is placed as a box of its own. A
 *   connector with an end on a container shape is no edge of the graph, but is redrawn
 *   between the facing sides afterwards. An end on a connect point the owner's type
 *   declares (an ER entity's column) stays there, and that connector's route is left to
 *   the engine, as is a self loop's
 * @param params - Direction and gaps; see {@link LayoutObjectsParams}
 * @param definitions - Type table `features.geometry`, `layoutContainer` (and the title band
 *   it answers for each object), the offered connect points and the `outline` /
 *   `anchorRegion` an end is kept on are read from
 * @returns Which objects moved, which containers were sized around them, which
 *   connectors were re-anchored or rerouted, and which were moved in the stacking order
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

	const graph = buildGraph(nodes, containers, edges, definitions);
	const marginById = new Map(
		graph.nodes.flatMap(({ id, visualMargin }) =>
			visualMargin === undefined ? [] : [[id, visualMargin] as const],
		),
	);
	const connectorById = new Map(
		edges.map((connector) => [connector.id, connector] as const),
	);
	const treeOrderIds: string[] = [];
	visitObjects(doc.root, ({ id }) => {
		treeOrderIds.push(id);
	});
	const laidOut = computeLayeredLayout(
		graph.nodes,
		sortEdgesByEndOrder(graph.edges, treeOrderIds),
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
		nodes,
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
	const restack = planLabelTextRestack(
		doc,
		listConnectorsUnderLabelText(
			laidOut.edges,
			graph.edges,
			marginById,
			(connectorId) =>
				isLayoutRouteWritten(connectorById.get(connectorId) as ConnectorDoc),
		),
	);
	applyLabelTextRestack(restack);

	return {
		nodeIds: nodes.map(({ object }) => object.id),
		containerIds: containers.map(({ object }) => object.id),
		connectorIds: [
			...written.map(({ id }) => id),
			...selfLoops.map(({ id }) => id),
			...redrawnIds,
		],
		restackedConnectorIds: restack.movedIds,
	};
};

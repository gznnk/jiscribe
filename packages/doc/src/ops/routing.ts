import {
	calcAffineTransformedPoint,
	calcBoundingBox,
	convertBoundingBoxToRect,
	degreesToRadians,
	doRectsOverlap,
	type Point,
	type Rect,
} from "@jiscribe/geometry";
import {
	type LayoutVisualMargin,
	type RoutableEdge,
	type RoutableNode,
	type RoutedEdge,
	routeEdgesAroundNodes,
} from "@jiscribe/layout";

import { buildEndpoint } from "./utils/connectorEndpoints";
import { measureLabelBox } from "./utils/connectorLabelBox";
import {
	readLayoutAnchorBodyRanges,
	readLayoutAnchorRanges,
	resolveLayoutAnchorShape,
} from "./utils/layoutAnchorShapes";
import { readOwnerId } from "./utils/layoutConnectorEnds";
import {
	applyLabelTextRestack,
	planLabelTextRestack,
	readLayoutVisualMargin,
	readLocalLabelTextRegion,
} from "./utils/layoutLabelTexts";
import { collectPlacements } from "./utils/layoutPlacements";
import {
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
} from "./utils/objectGeometry";
import { toStoredRouteCorners } from "./utils/routeCorners";
import { isTransformed } from "./utils/transformFields";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import type { ConnectorDoc } from "../model/objects/connector/ConnectorDoc";
import { toAnchorRegionSidePosition } from "../model/objects/connector/convertEdgeAnchorRatio";
import { GroupFeatures } from "../model/objects/primitives/group/GroupDoc";
import { isOnDeclaredConnectPoint } from "../model/objects/types/EndpointRef";
import { sortEdgesByEndOrder } from "../model/objects/utils/sortEdgesByEndOrder";
import { listConnectorsUnderLabelText } from "../text/label/calcLabelTextLayoutMargin";

/**
 * Why routeConnectors left a connector as it was, in the order it asks:
 * - `freeEnd`: an end attached to no shape, or to an id the document does not hold
 * - `selfLoop`: both ends on one shape
 * - `declaredConnectPoint`: an end on a connect point its owner's type declares (an ER
 *   entity's column), which the type, not a side, places
 * - `containerEnd`: an end on a shape whose type declares `container`
 * - `transformedEnd`: an end on a shape that is rotated or flipped
 * - `unmeasurableEnd`: an end on an object with no box to route around (a group, an
 *   unknown type)
 * - `overlappingEnds`: the two ends' boxes overlap
 * - `unroutable`: no way found between them
 */
export const ConnectorRouteKeptReasons = [
	"freeEnd",
	"selfLoop",
	"declaredConnectPoint",
	"containerEnd",
	"transformedEnd",
	"unmeasurableEnd",
	"overlappingEnds",
	"unroutable",
] as const;

export type ConnectorRouteKeptReason =
	(typeof ConnectorRouteKeptReasons)[number];

export type RouteConnectorsResult = {
	/** Ids of the connectors whose ends and corners were rewritten, in the order they were routed. */
	connectorIds: string[];
	/**
	 * Ids of the connectors left as they were, by reason (see
	 * {@link ConnectorRouteKeptReasons}), each in the document's tree order; a reason
	 * no connector had is absent.
	 */
	keptConnectorIdsByReason: Partial<Record<ConnectorRouteKeptReason, string[]>>;
	/**
	 * Ids of the connectors moved back in the stacking order, each to just beneath a
	 * shape whose caption it runs under (see planLabelTextRestack), each parent's in the
	 * order they stood before.
	 */
	restackedConnectorIds: string[];
};

/** A shape a route may end on or must go around, as the routing measures it. */
type SceneShape = {
	object: ObjectRecord;
	/** Its untransformed box. */
	bounds: Rect;
	isTransformed: boolean;
	node: RoutableNode;
};

/** Everything the routes go around: the shapes, and the containers' title bands and frames. */
type RoutingScene = {
	shapeById: Map<string, SceneShape>;
	containerIds: Set<string>;
	titleBands: Rect[];
	frames: Rect[];
};

/**
 * A rect in a shape's local coordinates (its centre the origin), turned and flipped
 * with the shape, as the box it fills in the world; an untransformed shape only moves it.
 */
const transformRect = (
	rect: Rect,
	centre: Point,
	object: ObjectRecord,
): Rect => {
	const rotation = typeof object.rotation === "number" ? object.rotation : 0;
	const scaleX = object.flipX === true ? -1 : 1;
	const scaleY = object.flipY === true ? -1 : 1;
	const rectCentre = calcAffineTransformedPoint(
		rect.x + rect.width / 2,
		rect.y + rect.height / 2,
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		centre.x,
		centre.y,
	);
	return convertBoundingBoxToRect(
		calcBoundingBox({
			cx: rectCentre.x,
			cy: rectCentre.y,
			width: rect.width,
			height: rect.height,
			rotation,
			scaleX,
			scaleY,
		}),
	);
};

/**
 * Every object a route goes around, wherever it sits in the tree: each shape with a
 * box, as the box it fills once turned (and its caption, likewise), and each container
 * shape's title band and frame. A connector, a group and a container shape are no
 * shapes of their own here.
 */
const collectRoutingScene = (
	doc: CanvasDoc,
	definitions: DocDefinitions,
): RoutingScene => {
	const scene: RoutingScene = {
		shapeById: new Map(),
		containerIds: new Set(),
		titleBands: [],
		frames: [],
	};
	visitObjects(doc.root, (object) => {
		if (
			isConnectorObject(object) ||
			object.type === GroupFeatures.type ||
			scene.shapeById.has(object.id)
		) {
			return;
		}
		const bounds = getObjectBounds(object, definitions);
		const container = definitions.get(object.type)?.container;
		if (container !== undefined) {
			scene.containerIds.add(object.id);
			if (bounds === null) {
				return;
			}
			scene.frames.push(bounds);
			const { titleHeight } = container(object);
			if (Number.isFinite(titleHeight) && titleHeight > 0) {
				scene.titleBands.push({
					...bounds,
					height: Math.min(titleHeight, bounds.height),
				});
			}
			return;
		}
		if (bounds === null) {
			return;
		}
		const transformed = isTransformed(object);
		const centre = {
			x: bounds.x + bounds.width / 2,
			y: bounds.y + bounds.height / 2,
		};
		const localLabel = readLocalLabelTextRegion(object, bounds, definitions);
		const labelBounds =
			localLabel === undefined
				? undefined
				: transformRect(localLabel, centre, object);
		scene.shapeById.set(object.id, {
			object,
			bounds,
			isTransformed: transformed,
			node: {
				id: object.id,
				bounds: transformed
					? transformRect(
							{
								x: -bounds.width / 2,
								y: -bounds.height / 2,
								width: bounds.width,
								height: bounds.height,
							},
							centre,
							object,
						)
					: bounds,
				...(labelBounds !== undefined ? { labelBounds } : {}),
			},
		});
	});
	return scene;
};

/**
 * The shapes a list of ids stands for, when it names shapes: each one named, a group's
 * descendants, and the shapes at a container shape's own level lying inside it (as
 * collectPlacements decides it).
 */
const collectNamedShapeIds = (
	doc: CanvasDoc,
	ids: readonly string[],
	definitions: DocDefinitions,
): { shapeIds: Set<string>; connectorIds: Set<string> } => {
	const shapeIds = new Set<string>();
	const connectorIds = new Set<string>();
	for (const { object, siblings } of requireObjects(doc, [...new Set(ids)])) {
		if (isConnectorObject(object)) {
			connectorIds.add(object.id);
			continue;
		}
		shapeIds.add(object.id);
		if (object.type === GroupFeatures.type) {
			visitObjects(readChildren(object), ({ id }) => {
				shapeIds.add(id);
			});
			continue;
		}
		if (definitions.get(object.type)?.container === undefined) {
			continue;
		}
		const { nodes, containers } = collectPlacements(
			siblings as ObjectRecord[],
			definitions,
			true,
		);
		const parentIdById = new Map(
			[...nodes, ...containers].map(
				({ object: placed, parentId }) => [placed.id, parentId] as const,
			),
		);
		const isMember = (id: string): boolean => {
			for (
				let parentId = parentIdById.get(id);
				parentId !== undefined;
				parentId = parentIdById.get(parentId)
			) {
				if (parentId === object.id) {
					return true;
				}
			}
			return false;
		};
		for (const { object: placed } of [...nodes, ...containers]) {
			if (isMember(placed.id)) {
				shapeIds.add(placed.id);
				visitObjects(readChildren(placed), ({ id }) => {
					shapeIds.add(id);
				});
			}
		}
	}
	return { shapeIds, connectorIds };
};

/** The connectors `ids` asks for, in tree order (see routeConnectors). */
const selectConnectors = (
	doc: CanvasDoc,
	ids: readonly string[] | undefined,
	definitions: DocDefinitions,
): ConnectorDoc[] => {
	const named =
		ids === undefined ? undefined : collectNamedShapeIds(doc, ids, definitions);
	const connectors: ConnectorDoc[] = [];
	visitObjects(doc.root, (object) => {
		if (!isConnectorObject(object)) {
			return;
		}
		const connector = object as unknown as ConnectorDoc;
		if (named === undefined || named.connectorIds.has(connector.id)) {
			connectors.push(connector);
			return;
		}
		const sourceId = readOwnerId(connector.source);
		const targetId = readOwnerId(connector.target);
		if (
			sourceId !== undefined &&
			targetId !== undefined &&
			named.shapeIds.has(sourceId) &&
			named.shapeIds.has(targetId)
		) {
			connectors.push(connector);
		}
	});
	return connectors;
};

/** Why the connector is left as it is, or undefined when it is to be routed. */
const readKeptReason = (
	connector: ConnectorDoc,
	scene: RoutingScene,
	objectIds: ReadonlySet<string>,
): ConnectorRouteKeptReason | undefined => {
	const sourceId = readOwnerId(connector.source);
	const targetId = readOwnerId(connector.target);
	if (
		sourceId === undefined ||
		targetId === undefined ||
		!objectIds.has(sourceId) ||
		!objectIds.has(targetId)
	) {
		return "freeEnd";
	}
	if (sourceId === targetId) {
		return "selfLoop";
	}
	if (
		isOnDeclaredConnectPoint(connector.source) ||
		isOnDeclaredConnectPoint(connector.target)
	) {
		return "declaredConnectPoint";
	}
	if (scene.containerIds.has(sourceId) || scene.containerIds.has(targetId)) {
		return "containerEnd";
	}
	const source = scene.shapeById.get(sourceId);
	const target = scene.shapeById.get(targetId);
	if (source?.isTransformed === true || target?.isTransformed === true) {
		return "transformedEnd";
	}
	if (source === undefined || target === undefined) {
		return "unmeasurableEnd";
	}
	return doRectsOverlap(source.bounds, target.bounds)
		? "overlappingEnds"
		: undefined;
};

/**
 * Redraw connectors between shapes that stay where they stand, mutating `doc` in
 * place: each one's ends are moved to the sides and spots that give it the cheapest
 * right-angled route around every other shape, caption and container title band in
 * the document (routeEdgesAroundNodes), and its corners are written as `points`
 * (none when it runs straight); `routing` is dropped. The routes are drawn one by one
 * in the order of their ends in the stacking order (sortEdgesByEndOrder), each keeping
 * off the ones drawn before it in this call; the connectors not redrawn are not kept
 * off. A label is moved (its `position` and `offset`) to where it covers as little of
 * any shape, and as few of the other labels and of the lines redrawn in the same call,
 * as it can; the connectors not redrawn, and their labels, are not taken into
 * account. A connector whose route runs under its own
 * end's caption is moved to just beneath that shape in the stacking order, as
 * layoutObjects does. Nothing follows a shape moved afterwards: run it again.
 *
 * @param doc - Mutated in place
 * @param ids - What to redraw; omitted, every connector in the document. A connector
 *   named is redrawn; a shape named stands for itself, a group for every object in it,
 *   and a container shape for itself and the shapes at its own level lying inside it,
 *   and every connector joining two shapes so named is redrawn. Every id must exist
 * @param definitions - Type table the boxes, `container` (and its title band), the
 *   captions of `features.text: "label"` types, the offered connect points and the
 *   `outline` / `anchorRegion` an end is kept on are read from
 * @returns Which connectors were redrawn, which were left as they were and why, and
 *   which were moved in the stacking order
 * @throws {@link DocOperationError} for an id that is missing, before anything is
 *   written
 */
export const routeConnectors = (
	doc: CanvasDoc,
	ids: readonly string[] | undefined,
	definitions: DocDefinitions,
): RouteConnectorsResult => {
	const connectors = selectConnectors(doc, ids, definitions);
	const scene = collectRoutingScene(doc, definitions);
	const treeOrderIds: string[] = [];
	visitObjects(doc.root, ({ id }) => {
		treeOrderIds.push(id);
	});
	const objectIds = new Set(treeOrderIds);

	const keptConnectorIdsByReason: RouteConnectorsResult["keptConnectorIdsByReason"] =
		{};
	const keep = (
		connectorId: string,
		reason: ConnectorRouteKeptReason,
	): void => {
		(keptConnectorIdsByReason[reason] ??= []).push(connectorId);
	};
	const connectorById = new Map<string, ConnectorDoc>();
	const edges: RoutableEdge[] = [];
	for (const connector of connectors) {
		const reason = readKeptReason(connector, scene, objectIds);
		if (reason !== undefined) {
			keep(connector.id, reason);
			continue;
		}
		connectorById.set(connector.id, connector);
		const label = measureLabelBox(connector);
		edges.push({
			id: connector.id,
			sourceId: readOwnerId(connector.source) as string,
			targetId: readOwnerId(connector.target) as string,
			...(label !== undefined ? { label } : {}),
		});
	}
	const endShapeIds = new Set(
		edges.flatMap(({ sourceId, targetId }) => [sourceId, targetId]),
	);
	const nodes = [...scene.shapeById.values()].map(
		({ object, bounds, node }): RoutableNode => {
			if (!endShapeIds.has(object.id)) {
				return node;
			}
			const shape = resolveLayoutAnchorShape(object, bounds, definitions);
			const anchorRanges = readLayoutAnchorRanges(object, shape);
			const anchorBodyRanges = readLayoutAnchorBodyRanges(shape);
			return {
				...node,
				...(anchorRanges !== undefined ? { anchorRanges } : {}),
				...(anchorBodyRanges !== undefined ? { anchorBodyRanges } : {}),
			};
		},
	);
	const sortedEdges = sortEdgesByEndOrder(edges, treeOrderIds);
	const routed = routeEdgesAroundNodes(nodes, sortedEdges, {
		obstacles: scene.titleBands,
		borders: scene.frames,
	});
	const unroutedIds = new Set(routed.unroutedEdgeIds);
	for (const { id } of edges) {
		if (unroutedIds.has(id)) {
			keep(id, "unroutable");
		}
	}

	// Every end is resolved before anything is written, so an owner that refuses one
	// leaves the document untouched.
	const locatedOwners = locateObjects(doc, endShapeIds);
	const toEndpoint = (
		ownerId: string,
		anchor: RoutedEdge["source"],
	): ConnectorDoc["source"] => {
		const { object, bounds } = scene.shapeById.get(ownerId) as SceneShape;
		return buildEndpoint(
			locatedOwners,
			ownerId,
			toAnchorRegionSidePosition(
				anchor,
				resolveLayoutAnchorShape(object, bounds, definitions),
			),
			definitions,
		);
	};
	const edgeById = new Map(edges.map((edge) => [edge.id, edge] as const));
	const writes = routed.edges.map((routedEdge) => {
		const { sourceId, targetId } = edgeById.get(routedEdge.id) as RoutableEdge;
		return {
			connector: connectorById.get(routedEdge.id) as ConnectorDoc,
			source: toEndpoint(sourceId, routedEdge.source),
			target: toEndpoint(targetId, routedEdge.target),
			points: toStoredRouteCorners(
				routedEdge.points,
				routedEdge.source.side,
				routedEdge.target.side,
			),
			routedEdge,
		};
	});
	for (const { connector, source, target, points, routedEdge } of writes) {
		connector.source = source;
		connector.target = target;
		connector.points = points;
		delete connector.routing;
		if (
			connector.label !== undefined &&
			routedEdge.labelPosition !== undefined
		) {
			connector.label.position = routedEdge.labelPosition;
			connector.label.offset = routedEdge.labelOffset ?? 0;
		}
	}

	const marginById = new Map<string, LayoutVisualMargin>();
	for (const id of endShapeIds) {
		const { object, bounds } = scene.shapeById.get(id) as SceneShape;
		const margin = readLayoutVisualMargin(object, bounds, definitions);
		if (margin !== undefined) {
			marginById.set(id, margin);
		}
	}
	const restack = planLabelTextRestack(
		doc,
		listConnectorsUnderLabelText(routed.edges, edges, marginById, () => true),
	);
	applyLabelTextRestack(restack);

	return {
		connectorIds: routed.edges.map(({ id }) => id),
		keptConnectorIdsByReason,
		restackedConnectorIds: restack.movedIds,
	};
};

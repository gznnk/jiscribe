import { doRectsOverlap, type Rect } from "@jiscribe/geometry";
import {
	type LayoutEdgeAnchor,
	type RoutableEdge,
	type RoutableNode,
	type RoutedEdge,
	routeEdgesAroundNodes,
} from "@jiscribe/layout";

import {
	readLayoutNodeAnchorFields,
	resolveLayoutAnchorShape,
} from "./utils/layoutAnchorShapes";
import { readOwnerId } from "./utils/layoutConnectorEnds";
import {
	readLayoutVisualMargin,
	readLocalLabelTextRegion,
} from "./utils/layoutLabelTextMeasures";
import { restackConnectorsUnderLabelTexts } from "./utils/layoutLabelTextRestack";
import { collectPlacements } from "./utils/layoutPlacements";
import {
	type ObjectRecord,
	listObjectIdsInTreeOrder,
	locateObjects,
	readChildren,
	requireObjects,
	visitObjects,
} from "./utils/objectAccess";
import {
	type DocDefinitions,
	calcWorldBoundsOfLocalRect,
	getObjectBounds,
	isConnectorObject,
} from "./utils/objectGeometry";
import { toStoredRouteCorners } from "./utils/routeCorners";
import {
	buildConnectorGraphEdge,
	buildRoutedEndpoint,
	writeRoutedConnector,
} from "./utils/routedConnectors";
import { isTransformed } from "./utils/transformFields";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import type { EdgeAnchorOutlineShape } from "../model/objects/connector/calcEdgeAnchorOutlineRange";
import type { ConnectorDoc } from "../model/objects/connector/ConnectorDoc";
import { GroupFeatures } from "../model/objects/primitives/group/GroupDoc";
import { isOnDeclaredConnectPoint } from "../model/objects/types/EndpointRef";
import { sortEdgesByEndOrder } from "../model/objects/utils/sortEdgesByEndOrder";
import type { ObjectDocConnectPointEdgeAnchor } from "../plugin/ObjectDocConnectPointEdgeAnchor";

/**
 * Why routeConnectors left a connector as it was, in the order it asks:
 * - `freeEnd`: an end attached to no shape, or to an id the document does not hold
 * - `selfLoop`: both ends on one shape
 * - `declaredConnectPoint`: an end on a connect point its owner's type declares and
 *   places on no side of its box (it answers no edge anchor for it, see
 *   `ObjectDocDefinition.extraConnectPointEdgeAnchors`)
 * - `transformedEnd`: an end on a shape that is rotated or flipped
 * - `unmeasurableEnd`: an end on an object with no box to route around (a group, an
 *   unknown type)
 * - `containerEnd`: an end on a shape whose type declares `container`, the other end's
 *   box overlapping it (a shape inside it, a container around it)
 * - `overlappingEnds`: the two ends' boxes overlap
 * - `unroutable`: no way found between them
 */
export const ConnectorRouteKeptReasons = [
	"freeEnd",
	"selfLoop",
	"declaredConnectPoint",
	"transformedEnd",
	"unmeasurableEnd",
	"containerEnd",
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
	 * shape whose caption it runs under (see restackConnectorsUnderLabelTexts), each parent's in the
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
	/** The container shapes with a box, which a route may end on but goes around nothing of. */
	containerById: Map<string, SceneShape>;
	containerIds: Set<string>;
	/** What no route enters of the title bands: a whole band, or the title in it. */
	titleObstacles: Rect[];
	/** The title bands a route may cross straight over, beside the title. */
	crossableTitleBands: Rect[];
	frames: Rect[];
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
		containerById: new Map(),
		containerIds: new Set(),
		titleObstacles: [],
		crossableTitleBands: [],
		frames: [],
	};
	const titleBands: {
		band: Rect;
		/** What `layoutContainerTitleRegion` answers, local to the container's centre. */
		titleRegion: Rect | undefined;
		centreX: number;
	}[] = [];
	visitObjects(doc.root, (object) => {
		if (
			isConnectorObject(object) ||
			object.type === GroupFeatures.type ||
			scene.shapeById.has(object.id)
		) {
			return;
		}
		const bounds = getObjectBounds(object, definitions);
		const definition = definitions.get(object.type);
		const container = definition?.layoutContainer;
		if (container !== undefined) {
			scene.containerIds.add(object.id);
			if (bounds === null) {
				return;
			}
			scene.frames.push(bounds);
			scene.containerById.set(object.id, {
				object,
				bounds,
				isTransformed: isTransformed(object),
				node: { id: object.id, bounds, isHollow: true },
			});
			const { titleHeight } = container(object);
			if (Number.isFinite(titleHeight) && titleHeight > 0) {
				// A turned container's title lies elsewhere than its untransformed box says.
				const titleRegion = isTransformed(object)
					? undefined
					: definition?.layoutContainerTitleRegion?.(object);
				titleBands.push({
					band: { ...bounds, height: Math.min(titleHeight, bounds.height) },
					titleRegion,
					centreX: bounds.x + bounds.width / 2,
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
				: calcWorldBoundsOfLocalRect(localLabel, centre, object);
		scene.shapeById.set(object.id, {
			object,
			bounds,
			isTransformed: transformed,
			node: {
				id: object.id,
				bounds: transformed
					? calcWorldBoundsOfLocalRect(
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
	const shapeBounds = [...scene.shapeById.values()].map(
		({ node }) => node.bounds,
	);
	const containerBounds = [...scene.containerById.values()].map(
		({ bounds }) => bounds,
	);
	for (const { band, titleRegion, centreX } of titleBands) {
		// A shape standing in the band could not leave it were the band crossable only
		// straight over, so such a band stays an obstacle, left out for that shape's
		// edges; so does one a container shape other than those around it stands in.
		if (
			titleRegion === undefined ||
			shapeBounds.some((bounds) => doRectsOverlap(bounds, band)) ||
			containerBounds.some(
				(bounds) =>
					doRectsOverlap(bounds, band) &&
					!(
						bounds.x <= band.x &&
						bounds.y <= band.y &&
						bounds.x + bounds.width >= band.x + band.width &&
						bounds.y + bounds.height >= band.y + band.height
					),
			)
		) {
			scene.titleObstacles.push(band);
			continue;
		}
		scene.crossableTitleBands.push(band);
		const left = Math.max(centreX + titleRegion.x, band.x);
		const right = Math.min(
			centreX + titleRegion.x + titleRegion.width,
			band.x + band.width,
		);
		if (right > left) {
			scene.titleObstacles.push({ ...band, x: left, width: right - left });
		}
	}
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
		if (definitions.get(object.type)?.layoutContainer === undefined) {
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

/** The shape or container shape an end sits on, as the scene measures it. */
const findEndShape = (
	scene: RoutingScene,
	ownerId: string,
): SceneShape | undefined =>
	scene.shapeById.get(ownerId) ?? scene.containerById.get(ownerId);

/** One place an end on a declared connect point may sit: the point's id and its place on the owner's box. */
type PinnedEnd = { id: string; anchor: LayoutEdgeAnchor };

/**
 * The places an end on a declared connect point may be routed from: the point it
 * names, then the other points of its `alternateGroup` in the order the type declares
 * them (`ObjectDocDefinition.extraConnectPointEdgeAnchors`); undefined when the
 * owner's type places the point on no side of its box.
 *
 * @param endpoint - An end on a declared connect point, its owner among the scene's shapes
 * @param edgeAnchorsByOwnerId - What the types answered so far, by owner id; filled in for an owner not yet asked
 */
const listPinnedEnds = (
	endpoint: ConnectorDoc["source"],
	scene: RoutingScene,
	definitions: DocDefinitions,
	edgeAnchorsByOwnerId: Map<string, readonly ObjectDocConnectPointEdgeAnchor[]>,
): PinnedEnd[] | undefined => {
	const ownerId = readOwnerId(endpoint);
	const shape =
		ownerId === undefined ? undefined : findEndShape(scene, ownerId);
	if (
		ownerId === undefined ||
		shape === undefined ||
		endpoint.anchor.kind !== "connectPoint"
	) {
		return undefined;
	}
	let edgeAnchors = edgeAnchorsByOwnerId.get(ownerId);
	if (edgeAnchors === undefined) {
		edgeAnchors =
			definitions
				.get(shape.object.type)
				?.extraConnectPointEdgeAnchors?.(shape.object) ?? [];
		edgeAnchorsByOwnerId.set(ownerId, edgeAnchors);
	}
	const namedId = endpoint.anchor.id;
	const named = edgeAnchors.find(({ id }) => id === namedId);
	if (named === undefined) {
		return undefined;
	}
	return [
		named,
		...edgeAnchors.filter(
			(edgeAnchor) =>
				edgeAnchor !== named &&
				named.alternateGroup !== undefined &&
				edgeAnchor.alternateGroup === named.alternateGroup,
		),
	].map(({ id, side, t }) => ({ id, anchor: { side, t } }));
};

/** Where each end of a connector may be routed from when it sits on a declared connect point; undefined for an end that does not, or whose point is on no side. */
type ConnectorPinnedEnds = {
	source: PinnedEnd[] | undefined;
	target: PinnedEnd[] | undefined;
};

/**
 * Why the connector is left as it is, or undefined when it is to be routed.
 *
 * @param pinnedEnds - What listPinnedEnds answers for each of its ends on a declared connect point
 */
const readKeptReason = (
	connector: ConnectorDoc,
	scene: RoutingScene,
	objectIds: ReadonlySet<string>,
	pinnedEnds: ConnectorPinnedEnds,
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
		(isOnDeclaredConnectPoint(connector.source) &&
			pinnedEnds.source === undefined) ||
		(isOnDeclaredConnectPoint(connector.target) &&
			pinnedEnds.target === undefined)
	) {
		return "declaredConnectPoint";
	}
	const source = findEndShape(scene, sourceId);
	const target = findEndShape(scene, targetId);
	if (source?.isTransformed === true || target?.isTransformed === true) {
		return "transformedEnd";
	}
	if (source === undefined || target === undefined) {
		return "unmeasurableEnd";
	}
	if (!doRectsOverlap(source.bounds, target.bounds)) {
		return undefined;
	}
	return scene.containerIds.has(sourceId) || scene.containerIds.has(targetId)
		? "containerEnd"
		: "overlappingEnds";
};

/**
 * Redraw connectors between shapes that stay where they stand, mutating `doc` in
 * place: each one's ends are moved to the sides and spots that give it the cheapest
 * right-angled route around every other shape, caption and container title in
 * the document (routeEdgesAroundNodes), and its corners are written as `points`
 * (none when it runs straight); `routing` is dropped. A container's title band is
 * crossed straight over beside its title, where the container's type says how much of
 * the band the title covers (`ObjectDocDefinition.layoutContainerTitleRegion`), the
 * container is neither rotated nor flipped and no shape stands in the band; any other
 * band is gone around whole. An end on a declared connect point its owner's type
 * places on a side of its box (`ObjectDocDefinition.extraConnectPointEdgeAnchors`)
 * stays on that point or moves to another of the same `alternateGroup`, whichever
 * gives the cheaper route, and the routes to one such point gather into one trunk. The routes are drawn one by one
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
 * @param definitions - Type table the boxes, `layoutContainer` (the title band) and
 *   `layoutContainerTitleRegion`, the captions of `features.text: "label"` types,
 *   `extraConnectPointEdgeAnchors` and the `outline` / `anchorRegion` an end is kept
 *   on are read from
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
	const treeOrderIds = listObjectIdsInTreeOrder(doc);
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
	const pinnedEndsById = new Map<string, ConnectorPinnedEnds>();
	const edgeAnchorsByOwnerId = new Map<
		string,
		readonly ObjectDocConnectPointEdgeAnchor[]
	>();
	const readPinnedEnds = (
		endpoint: ConnectorDoc["source"],
	): PinnedEnd[] | undefined =>
		isOnDeclaredConnectPoint(endpoint)
			? listPinnedEnds(endpoint, scene, definitions, edgeAnchorsByOwnerId)
			: undefined;
	const edges: RoutableEdge[] = [];
	for (const connector of connectors) {
		const pinnedEnds: ConnectorPinnedEnds = {
			source: readPinnedEnds(connector.source),
			target: readPinnedEnds(connector.target),
		};
		const reason = readKeptReason(connector, scene, objectIds, pinnedEnds);
		if (reason !== undefined) {
			keep(connector.id, reason);
			continue;
		}
		connectorById.set(connector.id, connector);
		pinnedEndsById.set(connector.id, pinnedEnds);
		edges.push({
			...buildConnectorGraphEdge(connector),
			...(pinnedEnds.source !== undefined
				? { sourceEnds: pinnedEnds.source.map(({ anchor }) => anchor) }
				: {}),
			...(pinnedEnds.target !== undefined
				? { targetEnds: pinnedEnds.target.map(({ anchor }) => anchor) }
				: {}),
		});
	}
	const endShapeIds = new Set(
		edges.flatMap(({ sourceId, targetId }) => [sourceId, targetId]),
	);
	// A container shape is a node only where a connector ends on it.
	const sceneShapes = [
		...scene.shapeById.values(),
		...[...scene.containerById.values()].filter(({ object }) =>
			endShapeIds.has(object.id),
		),
	];
	const anchorShapeById = new Map(
		sceneShapes
			.filter(({ object }) => endShapeIds.has(object.id))
			.map(
				({ object, bounds }) =>
					[
						object.id,
						resolveLayoutAnchorShape(object, bounds, definitions),
					] as const,
			),
	);
	const nodes = sceneShapes.map(({ object, node }): RoutableNode => {
		const shape = anchorShapeById.get(object.id);
		return shape === undefined
			? node
			: { ...node, ...readLayoutNodeAnchorFields(object, shape) };
	});
	const sortedEdges = sortEdgesByEndOrder(edges, treeOrderIds);
	const routed = routeEdgesAroundNodes(nodes, sortedEdges, {
		obstacles: scene.titleObstacles,
		crossableBands: scene.crossableTitleBands,
		borders: scene.frames,
	});
	const unroutedIds = new Set(routed.unroutedEdgeIds);
	for (const { id } of edges) {
		if (unroutedIds.has(id)) {
			keep(id, "unroutable");
		}
	}

	// Every end is resolved before anything is written, so an anchor that cannot be
	// stored leaves the document untouched.
	const locatedOwners = locateObjects(doc, endShapeIds);
	const toEndpoint = (
		ownerId: string,
		anchor: RoutedEdge["source"],
		pinnedEnds: PinnedEnd[] | undefined,
	): ConnectorDoc["source"] =>
		pinnedEnds !== undefined
			? {
					owner: { id: ownerId },
					anchor: {
						kind: "connectPoint",
						id: (
							pinnedEnds.find(
								(end) =>
									end.anchor.side === anchor.side && end.anchor.t === anchor.t,
							) as PinnedEnd
						).id,
					},
				}
			: buildRoutedEndpoint(
					locatedOwners,
					ownerId,
					anchor,
					anchorShapeById.get(ownerId) as EdgeAnchorOutlineShape,
					definitions,
				);
	const edgeById = new Map(edges.map((edge) => [edge.id, edge] as const));
	const writes = routed.edges.map((routedEdge) => {
		const { sourceId, targetId } = edgeById.get(routedEdge.id) as RoutableEdge;
		return {
			connector: connectorById.get(routedEdge.id) as ConnectorDoc,
			source: toEndpoint(
				sourceId,
				routedEdge.source,
				pinnedEndsById.get(routedEdge.id)?.source,
			),
			target: toEndpoint(
				targetId,
				routedEdge.target,
				pinnedEndsById.get(routedEdge.id)?.target,
			),
			points: toStoredRouteCorners(
				routedEdge.points,
				routedEdge.source.side,
				routedEdge.target.side,
			),
			routedEdge,
		};
	});
	for (const { connector, source, target, points, routedEdge } of writes) {
		writeRoutedConnector(connector, source, target, points, routedEdge);
	}

	const restackedConnectorIds = restackConnectorsUnderLabelTexts(
		doc,
		routed.edges,
		edges,
		[...endShapeIds].map((id) => {
			const { object, bounds } = findEndShape(scene, id) as SceneShape;
			return {
				id,
				visualMargin: readLayoutVisualMargin(object, bounds, definitions),
			};
		}),
		() => true,
	);

	return {
		connectorIds: routed.edges.map(({ id }) => id),
		keptConnectorIdsByReason,
		restackedConnectorIds,
	};
};

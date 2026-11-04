import type { Rect } from "@jiscribe/geometry";
import {
	computeLayeredLayout,
	type LayoutDirection,
	type LayoutGraphEdge,
	type LayoutGraphFrame,
	type LayoutGraphNode,
} from "@jiscribe/layout";

import { DocOperationError } from "./errors";
import {
	type EdgeAnchorHandle,
	buildEndpoint,
} from "./utils/connectorEndpoints";
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
	ConnectPointIds,
	type EndpointRef,
} from "../model/objects/types/EndpointRef";
import { calcTextBlockSize } from "../text/block/calcTextBlockSize";

export type { LayoutDirection } from "@jiscribe/layout";

export type LayoutObjectsParams = {
	/** Which way the flow runs; defaults to `TB` (sources above targets). */
	direction?: LayoutDirection;
	/** Gap in px between neighbours of one rank; defaults to 80. */
	nodeSpacing?: number;
	/** Gap in px between one rank and the next; defaults to 80. */
	rankSpacing?: number;
};

export type LayoutObjectsResult = {
	/** Ids of the objects that were placed, in the order they were given (or found). */
	nodeIds: string[];
	/** Ids of the frames (groups, and shapes whose type declares `features.frame`) sized around their members. */
	frameIds: string[];
	/** Ids of the connectors whose ends were re-anchored and whose routes were rewritten. */
	connectorIds: string[];
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
	!(ConnectPointIds as readonly string[]).includes(endpoint.anchor.id);

const centreOf = (bounds: Rect): { x: number; y: number } => ({
	x: bounds.x + bounds.width / 2,
	y: bounds.y + bounds.height / 2,
});

/** The sides of two boxes that face each other, by the larger offset between their centres. */
const calcFacingSides = (
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

/** A shape whose type declares itself a frame other objects sit inside (`features.frame`). */
const isFrameShape = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): boolean => definitions.get(object.type)?.features.frame !== undefined;

/** Room the frame's type keeps for its title band; a group has none. */
const readTitleHeight = (
	object: ObjectRecord,
	definitions: DocDefinitions,
): number => definitions.get(object.type)?.features.frame?.titleHeight ?? 0;

const isGroupObject = (object: ObjectRecord): boolean =>
	object.type === GroupFeatures.type;

const contains = (outer: Rect, inner: Rect): boolean =>
	inner.x >= outer.x &&
	inner.y >= outer.y &&
	inner.x + inner.width <= outer.x + outer.width &&
	inner.y + inner.height <= outer.y + outer.height;

/** `level` is the group the object was found in; `parentId` the frame it ends up inside. */
type PlacedNode = {
	object: ObjectRecord;
	bounds: Rect;
	level?: string;
	parentId?: string;
};

/** A group (members: its children) or a frame shape (members: what lies inside it). */
type PlacedFrame = {
	object: ObjectRecord;
	bounds?: Rect;
	level?: string;
	parentId?: string;
};

/**
 * Sort the candidates into the nodes to place and the frames around them. A group's
 * members are its children; a frame shape's members are the candidates at its own level
 * that lie inside it, the smallest such frame winning when they nest.
 */
const collectPlacements = (
	candidates: readonly ObjectRecord[],
	definitions: DocDefinitions,
): { nodes: PlacedNode[]; frames: PlacedFrame[] } => {
	const nodes: PlacedNode[] = [];
	const frames: PlacedFrame[] = [];
	const visit = (objects: readonly ObjectRecord[], parentId?: string): void => {
		for (const object of objects) {
			if (isConnectorObject(object)) {
				continue;
			}
			if (isGroupObject(object)) {
				frames.push({ object, level: parentId, parentId });
				visit(readChildren(object), object.id);
			} else if (isFrameShape(object, definitions)) {
				frames.push({
					object,
					bounds: requireObjectBounds(object, definitions),
					level: parentId,
					parentId,
				});
			} else {
				nodes.push({
					object,
					bounds: requireObjectBounds(object, definitions),
					level: parentId,
					parentId,
				});
			}
		}
	};
	visit(candidates);
	// Geometry decides what a frame shape holds: among what sits at its level, the
	// smallest frame around a box is its parent.
	const frameShapes = frames.filter(
		(frame): frame is PlacedFrame & { bounds: Rect } =>
			frame.bounds !== undefined,
	);
	const adopt = (placed: PlacedNode | PlacedFrame, bounds: Rect): void => {
		let smallest: (PlacedFrame & { bounds: Rect }) | undefined;
		for (const frame of frameShapes) {
			if (
				frame.object === placed.object ||
				frame.level !== placed.level ||
				!contains(frame.bounds, bounds)
			) {
				continue;
			}
			if (
				smallest === undefined ||
				frame.bounds.width * frame.bounds.height <
					smallest.bounds.width * smallest.bounds.height
			) {
				smallest = frame;
			}
		}
		if (smallest !== undefined) {
			placed.parentId = smallest.object.id;
		}
	};
	// Frames first, so a node inside a nested frame is adopted by the inner one at the
	// inner one's level rather than by both.
	const byArea = [...frameShapes].sort(
		(a, b) =>
			a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height,
	);
	for (const frame of byArea) {
		adopt(frame, frame.bounds);
	}
	for (const node of nodes) {
		adopt(node, node.bounds);
	}
	// A frame holding nothing to place (an empty group, a frame shape nothing lies in) is
	// left where it is: the layout has nothing to size it around.
	const holdsNodes = (frameId: string): boolean =>
		nodes.some((node) => node.parentId === frameId) ||
		frames.some(
			(frame) => frame.parentId === frameId && holdsNodes(frame.object.id),
		);
	const occupied = frames.filter((frame) => holdsNodes(frame.object.id));
	const occupiedIds = new Set(occupied.map(({ object }) => object.id));
	for (const placed of [...nodes, ...occupied]) {
		if (placed.parentId !== undefined && !occupiedIds.has(placed.parentId)) {
			placed.parentId = undefined;
		}
	}
	return { nodes, frames: occupied };
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
 * objects in between written as its corners (none when it runs straight). A labelled connector
 * gets room for its label, which is moved onto the line at that spot. The arrangement keeps the top-left corner the objects occupied together, so the
 * drawing stays where it was.
 *
 * @param doc - Mutated in place
 * @param ids - Objects to place; omitted means every top-level object. Connectors among
 *   them are skipped (they follow their ends). A group is a frame around its children, and
 *   a shape whose type declares `features.frame` (a container, a VPC) is a frame around
 *   the objects lying inside it: members are laid out inside their frame, and a frame
 *   shape is moved and resized to the box the layout draws around them. A connector with
 *   an end on a frame shape is no edge of the graph, but is redrawn between the facing
 *   sides afterwards. An end on a connect point the owner's type declares (an ER
 *   entity's column) stays there, and that connector's route is left to the engine
 * @param params - Direction and gaps; see {@link LayoutObjectsParams}
 * @param definitions - Type table `features.geometry` and the offered connect points are read from
 * @returns Which objects moved and which connectors were re-anchored
 * @throws {@link DocOperationError} for fewer than 2 placeable objects, an id that is missing,
 *   or an object with no position of its own — before anything is moved
 */
export const layoutObjects = (
	doc: CanvasDoc,
	ids: readonly string[] | undefined,
	params: LayoutObjectsParams,
	definitions: DocDefinitions,
): LayoutObjectsResult => {
	const candidates: ObjectRecord[] =
		ids === undefined
			? (doc.root as ObjectRecord[])
			: requireObjects(doc, [...new Set(ids)]).map(({ object }) => object);
	const { nodes: measured, frames } = collectPlacements(
		candidates,
		definitions,
	);
	if (measured.length < 2) {
		throw new DocOperationError(
			`layout needs at least 2 objects to place, got ${measured.length}`,
		);
	}
	const nodeIds = new Set(measured.map(({ object }) => object.id));

	// Every connector in the document whose both ends sit on placed objects is an edge,
	// wherever the connector itself lives.
	const connectors: ConnectorDoc[] = [];
	visitObjects(doc.root, (object) => {
		if (!isConnectorObject(object)) {
			return;
		}
		const connector = object as unknown as ConnectorDoc;
		const sourceId = readOwnerId(connector.source);
		const targetId = readOwnerId(connector.target);
		if (
			sourceId !== undefined &&
			targetId !== undefined &&
			nodeIds.has(sourceId) &&
			nodeIds.has(targetId)
		) {
			connectors.push(connector);
		}
	});

	const graphNodes: LayoutGraphNode[] = measured.map(
		({ object, bounds, parentId }) => ({
			id: object.id,
			width: bounds.width,
			height: bounds.height,
			...(parentId !== undefined ? { parentId } : {}),
		}),
	);
	const graphFrames: LayoutGraphFrame[] = frames.map(
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
		graphFrames,
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

	const framed = frames.filter(
		(frame): frame is PlacedFrame & { bounds: Rect } =>
			frame.bounds !== undefined,
	);
	const everyBox = [...measured, ...framed].map(({ bounds }) => bounds);
	const originX = Math.min(...everyBox.map((bounds) => bounds.x));
	const originY = Math.min(...everyBox.map((bounds) => bounds.y));
	const boundsById = new Map(
		measured.map(({ object, bounds }) => [object.id, bounds] as const),
	);
	const objectById = new Map(
		measured.map(({ object }) => [object.id, object] as const),
	);
	for (const { id, bounds } of laidOut.nodes) {
		const before = boundsById.get(id) as { x: number; y: number };
		translateObject(
			objectById.get(id) as ObjectRecord,
			originX + bounds.x - before.x,
			originY + bounds.y - before.y,
			definitions,
		);
	}
	// A frame shape takes the box the layout drew around its members; a group has no
	// box of its own and simply follows its children.
	const laidOutFrameById = new Map(
		laidOut.frames.map((frame) => [frame.id, frame.bounds] as const),
	);
	for (const { object } of framed) {
		const bounds = laidOutFrameById.get(object.id);
		if (bounds === undefined) {
			continue;
		}
		object.x = Math.round(originX + bounds.x);
		object.y = Math.round(originY + bounds.y);
		object.width = Math.round(bounds.width);
		object.height = Math.round(bounds.height);
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

	// A connector with an end on a frame shape is no edge of the graph, but it is
	// redrawn between the facing sides of where the frame and its other end ended up,
	// its route left to the engine.
	const framedIds = new Set(framed.map(({ object }) => object.id));
	const boxOf = (id: string): Rect | undefined => {
		const placed =
			measured.find(({ object }) => object.id === id) ??
			framed.find(({ object }) => object.id === id);
		return placed === undefined
			? undefined
			: requireObjectBounds(placed.object, definitions);
	};
	const locatedFrameOwners = locateObjects(
		doc,
		new Set([...nodeIds, ...framedIds]),
	);
	const frameConnectorIds: string[] = [];
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
			!(framedIds.has(sourceId) || framedIds.has(targetId))
		) {
			return;
		}
		const sourceBox = boxOf(sourceId);
		const targetBox = boxOf(targetId);
		if (sourceBox === undefined || targetBox === undefined) {
			return;
		}
		const sides = calcFacingSides(sourceBox, targetBox);
		connector.source = buildEndpoint(
			locatedFrameOwners,
			sourceId,
			sides.source,
			definitions,
		);
		connector.target = buildEndpoint(
			locatedFrameOwners,
			targetId,
			sides.target,
			definitions,
		);
		connector.points = [];
		delete connector.routing;
		frameConnectorIds.push(connector.id);
	});

	return {
		nodeIds: measured.map(({ object }) => object.id),
		frameIds: frames.map(({ object }) => object.id),
		connectorIds: [
			...endpointWrites.map(({ connector }) => connector.id),
			...frameConnectorIds,
		],
	};
};

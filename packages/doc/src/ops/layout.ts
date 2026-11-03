import {
	computeLayeredLayout,
	type LayoutDirection,
	type LayoutGraphEdge,
	type LayoutGraphNode,
} from "@jiscribe/layout";

import { DocOperationError } from "./errors";
import { type AnchorHandleId, buildEndpoint } from "./utils/connectorEndpoints";
import {
	type ObjectLocation,
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
import type { ConnectorDoc } from "../model/objects/connector/ConnectorDoc";
import type { EndpointRef } from "../model/objects/types/EndpointRef";

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
	/** Ids of the connectors whose ends were re-anchored and whose routes were rewritten. */
	connectorIds: string[];
};

const readOwnerId = (endpoint: EndpointRef): string | undefined =>
	endpoint.owner?.id;

/**
 * Arrange objects as a layered graph, mutating `doc` in place: the connectors between
 * them decide the ranks (a source sits above, or left of, its targets), nodes of one rank
 * are ordered to reduce crossings, and every connector between two placed objects is
 * re-anchored onto the sides that now face each other (an edge anchor, placed toward where
 * the connector goes so several on one side fan out), with a right-angled route around the
 * objects in between written as its corners (none when it runs straight). The arrangement keeps the top-left corner the objects occupied together, so the
 * drawing stays where it was.
 *
 * @param doc - Mutated in place
 * @param ids - Objects to place; omitted means every top-level object. Connectors among
 *   them are skipped (they follow their ends), a group moves as one box with its children
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
	const nodes = candidates.filter((object) => !isConnectorObject(object));
	if (nodes.length < 2) {
		throw new DocOperationError(
			`layout needs at least 2 objects to place, got ${nodes.length}`,
		);
	}
	const measured = nodes.map((object) => ({
		object,
		bounds: requireObjectBounds(object, definitions),
	}));
	const nodeIds = new Set(nodes.map(({ id }) => id));

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

	const graphNodes: LayoutGraphNode[] = measured.map(({ object, bounds }) => ({
		id: object.id,
		width: bounds.width,
		height: bounds.height,
	}));
	const graphEdges: LayoutGraphEdge[] = connectors.map((connector) => ({
		id: connector.id,
		sourceId: readOwnerId(connector.source) as string,
		targetId: readOwnerId(connector.target) as string,
	}));
	const laidOut = computeLayeredLayout(graphNodes, graphEdges, params);

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
		return {
			connector,
			source: buildEndpoint(
				locatedOwners,
				readOwnerId(connector.source) as string,
				edge.source,
				definitions,
			),
			target: buildEndpoint(
				locatedOwners,
				readOwnerId(connector.target) as string,
				edge.target,
				definitions,
			),
		};
	});

	const originX = Math.min(...measured.map(({ bounds }) => bounds.x));
	const originY = Math.min(...measured.map(({ bounds }) => bounds.y));
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
	const cornersByEdgeId = new Map(
		laidOut.edges.map((edge) => [edge.id, edge.points] as const),
	);
	for (const { connector, source, target } of endpointWrites) {
		connector.source = source;
		connector.target = target;
		connector.points = (cornersByEdgeId.get(connector.id) ?? []).map(
			({ x, y }) => ({
				x: Math.round(originX + x),
				y: Math.round(originY + y),
			}),
		);
		// A straight line is what a centre anchor defaults to; between the facing sides
		// the arrangement was made for, the right-angled route is the one that reads.
		delete connector.routing;
	}

	return {
		nodeIds: nodes.map(({ id }) => id),
		connectorIds: endpointWrites.map(({ connector }) => connector.id),
	};
};

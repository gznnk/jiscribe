import { Graph, layout } from "@dagrejs/dagre";
import type { Point } from "@jiscribe/geometry";

import type {
	LaidOutContainer,
	LaidOutNode,
	LayeredLayoutOptions,
	LayoutGraphContainer,
	LayoutGraphEdge,
	LayoutGraphNode,
} from "./types";

/** What dagre routed for one edge, in the drawing's own coordinates. */
export type DagreEdge = {
	edge: LayoutGraphEdge;
	/** The polyline dagre routed, border to border. */
	points: Point[];
	/** Where dagre centred the label, for an edge given one. */
	labelPoint?: Point;
};

export type DagreResult = {
	nodes: LaidOutNode[];
	containers: LaidOutContainer[];
	/** Every edge given except the self loops, which dagre does not route. */
	edges: DagreEdge[];
};

/**
 * Run dagre's layered layout over the graph, checking the input first, and hand the
 * result back translated so the drawing's top-left is (0, 0).
 *
 * @param nodes - The boxes to place; ids must be distinct
 * @param edges - Directed edges between the nodes; one naming an unknown node or a
 *   container is an error, a self loop is left out
 * @param options - Direction and gaps, every field present
 * @param containers - Containers the nodes may sit inside; each must hold a node or a
 *   container, since dagre sizes it from what it holds
 */
export const runDagre = (
	nodes: readonly LayoutGraphNode[],
	edges: readonly LayoutGraphEdge[],
	options: Required<LayeredLayoutOptions>,
	containers: readonly LayoutGraphContainer[],
): DagreResult => {
	const graph = new Graph({ multigraph: true, compound: true });
	graph.setGraph({
		rankdir: options.direction,
		nodesep: options.nodeSpacing,
		ranksep: options.rankSpacing,
		marginx: 0,
		marginy: 0,
	});
	graph.setDefaultEdgeLabel(() => ({}));
	const containerIds = new Set<string>();
	for (const container of containers) {
		if (containerIds.has(container.id)) {
			throw new Error(`duplicate container id: ${container.id}`);
		}
		containerIds.add(container.id);
		graph.setNode(container.id, {});
	}
	const requireContainer = (ownerId: string, parentId: string): void => {
		if (!containerIds.has(parentId)) {
			throw new Error(`${ownerId} names an unknown container: ${parentId}`);
		}
	};
	for (const container of containers) {
		if (container.parentId !== undefined) {
			requireContainer(container.id, container.parentId);
			graph.setParent(container.id, container.parentId);
		}
	}
	const nodeIds = new Set<string>();
	for (const node of nodes) {
		if (nodeIds.has(node.id) || containerIds.has(node.id)) {
			throw new Error(`duplicate node id: ${node.id}`);
		}
		nodeIds.add(node.id);
		graph.setNode(node.id, { width: node.width, height: node.height });
		if (node.parentId !== undefined) {
			requireContainer(node.id, node.parentId);
			graph.setParent(node.id, node.parentId);
		}
	}
	// dagre sizes a container from what it holds, so an empty one has no size to give.
	for (const container of containers) {
		if (graph.children(container.id).length === 0) {
			throw new Error(`container ${container.id} holds nothing`);
		}
	}
	const routedEdges: LayoutGraphEdge[] = [];
	for (const edge of edges) {
		for (const endId of [edge.sourceId, edge.targetId]) {
			if (containerIds.has(endId)) {
				throw new Error(`edge ${edge.id} ends on a container: ${endId}`);
			}
			if (!nodeIds.has(endId)) {
				throw new Error(`edge ${edge.id} names an unknown node: ${endId}`);
			}
		}
		if (edge.sourceId === edge.targetId) {
			continue;
		}
		graph.setEdge(
			edge.sourceId,
			edge.targetId,
			edge.label === undefined
				? {}
				: { width: edge.label.width, height: edge.label.height, labelpos: "c" },
			edge.id,
		);
		routedEdges.push(edge);
	}

	layout(graph);

	// dagre hands back centres, offset by whatever margin its ranking left; pin the
	// drawing's top-left to the origin so the caller works in one known coordinate frame.
	const centredNodes = nodes.map((node) => {
		const placed = graph.node(node.id) as { x: number; y: number };
		return {
			id: node.id,
			bounds: {
				x: placed.x - node.width / 2,
				y: placed.y - node.height / 2,
				width: node.width,
				height: node.height,
			},
		};
	});
	const centredContainers = containers.map((container) => {
		const placed = graph.node(container.id) as {
			x: number;
			y: number;
			width: number;
			height: number;
		};
		return {
			id: container.id,
			bounds: {
				x: placed.x - placed.width / 2,
				y: placed.y - placed.height / 2,
				width: placed.width,
				height: placed.height,
			},
		};
	});
	const everyBox = [...centredNodes, ...centredContainers].map(
		({ bounds }) => bounds,
	);
	const originX = Math.min(...everyBox.map((bounds) => bounds.x));
	const originY = Math.min(...everyBox.map((bounds) => bounds.y));
	const shift = ({ id, bounds }: LaidOutNode): LaidOutNode => ({
		id,
		bounds: { ...bounds, x: bounds.x - originX, y: bounds.y - originY },
	});
	return {
		nodes: centredNodes.map(shift),
		containers: centredContainers.map(shift),
		edges: routedEdges.map((edge) => {
			const routed = graph.edge(edge.sourceId, edge.targetId, edge.id) as {
				points?: Point[];
				x?: number;
				y?: number;
			};
			return {
				edge,
				points: (routed.points ?? []).map(({ x, y }) => ({
					x: x - originX,
					y: y - originY,
				})),
				...(edge.label !== undefined &&
				routed.x !== undefined &&
				routed.y !== undefined
					? { labelPoint: { x: routed.x - originX, y: routed.y - originY } }
					: {}),
			};
		}),
	};
};

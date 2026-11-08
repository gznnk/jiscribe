/** A graph as {@link splitLayoutGraph} takes and returns it; the extra fields of each part ride along untouched. */
export type SplittableLayoutGraph<
	N extends { id: string; parentId?: string },
	C extends { id: string; parentId?: string },
	E extends { sourceId: string; targetId: string },
> = {
	nodes: N[];
	containers: C[];
	edges: E[];
};

/**
 * Split a graph into its connected parts: two nodes belong together when an edge joins
 * them or when they sit in the same container, directly or through nested ones.
 *
 * @param graph - Nodes, containers and edges by id, such as `resolvePlacements` returns
 *   with the edges added; ids must be distinct across nodes and containers. A `parentId`
 *   or an edge end naming no node or container is ignored, and such an edge is left out
 * @returns One graph per part, ordered by each part's first node in `graph.nodes`, each
 *   keeping the input order of its nodes, containers and edges. A part with a single
 *   node or with no edge is returned too; a container whose part holds no node is left
 *   out. An empty graph gives an empty list
 */
export const splitLayoutGraph = <
	N extends { id: string; parentId?: string },
	C extends { id: string; parentId?: string },
	E extends { sourceId: string; targetId: string },
>(
	graph: SplittableLayoutGraph<N, C, E>,
): SplittableLayoutGraph<N, C, E>[] => {
	const leaderById = new Map<string, string>();
	for (const { id } of [...graph.nodes, ...graph.containers]) {
		leaderById.set(id, id);
	}
	const findLeader = (id: string): string => {
		let leader = id;
		while (leaderById.get(leader) !== leader) {
			leader = leaderById.get(leader) as string;
		}
		leaderById.set(id, leader);
		return leader;
	};
	const unite = (firstId: string, secondId: string | undefined): void => {
		if (secondId === undefined || !leaderById.has(secondId)) {
			return;
		}
		leaderById.set(findLeader(firstId), findLeader(secondId));
	};
	for (const { id, parentId } of [...graph.nodes, ...graph.containers]) {
		unite(id, parentId);
	}
	const isKnownEdge = ({ sourceId, targetId }: E): boolean =>
		leaderById.has(sourceId) && leaderById.has(targetId);
	for (const edge of graph.edges) {
		if (isKnownEdge(edge)) {
			unite(edge.sourceId, edge.targetId);
		}
	}

	const partByLeader = new Map<string, SplittableLayoutGraph<N, C, E>>();
	for (const node of graph.nodes) {
		const leader = findLeader(node.id);
		const part = partByLeader.get(leader);
		if (part === undefined) {
			partByLeader.set(leader, { nodes: [node], containers: [], edges: [] });
		} else {
			part.nodes.push(node);
		}
	}
	for (const container of graph.containers) {
		partByLeader.get(findLeader(container.id))?.containers.push(container);
	}
	for (const edge of graph.edges) {
		if (isKnownEdge(edge)) {
			partByLeader.get(findLeader(edge.sourceId))?.edges.push(edge);
		}
	}
	return [...partByLeader.values()];
};

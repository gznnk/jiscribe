import { bench, describe } from "vitest";

import { computeLayeredLayout } from "../computeLayeredLayout";
import type { LayoutGraphEdge, LayoutGraphNode } from "../types";

type Graph = { nodes: LayoutGraphNode[]; edges: LayoutGraphEdge[] };

const box = (id: string): LayoutGraphNode => ({ id, width: 160, height: 80 });

/** A deterministic generator, so a run compares with the last. */
const createRandom = (seed: number): (() => number) => {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
};

const chain = (count: number): Graph => ({
	nodes: Array.from({ length: count }, (_, i) => box(`n${i}`)),
	edges: Array.from({ length: count - 1 }, (_, i) => ({
		id: `e${i}`,
		sourceId: `n${i}`,
		targetId: `n${i + 1}`,
	})),
});

const tree = (count: number): Graph => ({
	nodes: Array.from({ length: count }, (_, i) => box(`n${i}`)),
	edges: Array.from({ length: count - 1 }, (_, i) => ({
		id: `e${i}`,
		sourceId: `n${Math.floor(i / 3)}`,
		targetId: `n${i + 1}`,
	})),
});

/** Every node points at one to three earlier nodes, a quarter of the edges labelled. */
const dag = (count: number): Graph => {
	const random = createRandom(count);
	const edges: LayoutGraphEdge[] = [];
	for (let i = 1; i < count; i += 1) {
		const fanIn = 1 + Math.floor(random() * 3);
		for (let k = 0; k < fanIn; k += 1) {
			const sourceIndex = Math.floor(random() * i);
			edges.push({
				id: `e${edges.length}`,
				sourceId: `n${sourceIndex}`,
				targetId: `n${i}`,
				...(random() < 0.25 ? { label: { width: 60, height: 24 } } : {}),
			});
		}
	}
	return {
		nodes: Array.from({ length: count }, (_, i) => box(`n${i}`)),
		edges,
	};
};

for (const [name, build] of [
	["chain", chain],
	["tree", tree],
	["dag", dag],
] as const) {
	describe(name, () => {
		for (const count of [20, 50, 100, 200, 500]) {
			const graph = build(count);
			bench(
				`${count} nodes, ${graph.edges.length} edges`,
				() => {
					computeLayeredLayout(graph.nodes, graph.edges);
				},
				{ iterations: count >= 200 ? 3 : 10, warmupIterations: 1 },
			);
		}
	});
}

import { bench, describe } from "vitest";

import type { RoutableEdge, RoutableNode } from "../../shared/types";
import { routeEdgesAroundNodes } from "../routeEdgesAroundNodes";

/** A deterministic generator, so a run compares with the last. */
const createRandom = (seed: number): (() => number) => {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
};

/**
 * Icons with a caption below each, scattered over a square grid of 220px cells (no two
 * touching), joined by as many edges as there are icons: between random pairs, which
 * cross the whole drawing, or between icons at most two cells apart, as an
 * architecture diagram placed by hand mostly joins them.
 */
const scatteredIcons = (
	count: number,
	pairs: "random" | "nearby",
): { nodes: RoutableNode[]; edges: RoutableEdge[] } => {
	const random = createRandom(count);
	const columns = Math.ceil(Math.sqrt(count));
	const nodes = Array.from({ length: count }, (_, index): RoutableNode => {
		const x = (index % columns) * 220 + Math.floor(random() * 80);
		const y = Math.floor(index / columns) * 220 + Math.floor(random() * 60);
		return {
			id: `n${index}`,
			bounds: { x, y, width: 64, height: 64 },
			labelBounds: { x: x - 20, y: y + 68, width: 104, height: 18 },
		};
	});
	const pickTarget = (sourceIndex: number): number => {
		if (pairs === "random") {
			return (sourceIndex + 1 + Math.floor(random() * (count - 1))) % count;
		}
		for (;;) {
			const column = (sourceIndex % columns) + Math.floor(random() * 5) - 2;
			const row =
				Math.floor(sourceIndex / columns) + Math.floor(random() * 5) - 2;
			const targetIndex = row * columns + column;
			if (
				column >= 0 &&
				column < columns &&
				targetIndex >= 0 &&
				targetIndex < count &&
				targetIndex !== sourceIndex
			) {
				return targetIndex;
			}
		}
	};
	const edges = Array.from({ length: count }, (_, index): RoutableEdge => {
		const sourceIndex = Math.floor(random() * count);
		return {
			id: `e${index}`,
			sourceId: `n${sourceIndex}`,
			targetId: `n${pickTarget(sourceIndex)}`,
		};
	});
	return { nodes, edges };
};

/**
 * Icons with a caption below each, side by side on one row 100px apart, the first two
 * joined: every horizontal line through the icons crosses all their margin bands.
 */
const iconsInOneRow = (
	count: number,
): { nodes: RoutableNode[]; edges: RoutableEdge[] } => {
	const nodes = Array.from({ length: count }, (_, index): RoutableNode => {
		const x = index * 100;
		return {
			id: `n${index}`,
			bounds: { x, y: 0, width: 64, height: 64 },
			labelBounds: { x: x - 10, y: 68, width: 84, height: 18 },
		};
	});
	const edges = [{ id: "e0", sourceId: "n0", targetId: "n1" }];
	return { nodes, edges };
};

/**
 * Zones of `zoneCells` × `zoneCells` cells, a zone starting every `zoneCells - 1` cells
 * so neighbouring zones overlap by a cell, laid over 100 icons with nearby pairs: an
 * edge leaves out every zone over either end, so the edges leave out many different sets.
 */
const iconsInOverlappingZones = (
	zoneCells: number,
): {
	nodes: RoutableNode[];
	edges: RoutableEdge[];
	zones: { x: number; y: number; width: number; height: number }[];
} => {
	const { nodes, edges } = scatteredIcons(100, "nearby");
	const zones: { x: number; y: number; width: number; height: number }[] = [];
	for (let row = 0; row + 1 < 10; row += zoneCells - 1) {
		for (let column = 0; column + 1 < 10; column += zoneCells - 1) {
			zones.push({
				x: column * 220 - 30,
				y: row * 220 - 30,
				width: zoneCells * 220,
				height: zoneCells * 220,
			});
		}
	}
	return { nodes, edges, zones };
};

describe("icons in one row", () => {
	const { nodes, edges } = iconsInOneRow(800);
	bench(
		`${nodes.length} nodes, ${edges.length} edge`,
		() => {
			routeEdgesAroundNodes(nodes, edges);
		},
		{ iterations: 5, warmupIterations: 1 },
	);
});

describe("icons in overlapping zones", () => {
	const { nodes, edges, zones } = iconsInOverlappingZones(4);
	bench(
		`${nodes.length} nodes, ${edges.length} edges, ${zones.length} zones`,
		() => {
			routeEdgesAroundNodes(nodes, edges, { obstacles: zones });
		},
		{ iterations: 3, warmupIterations: 1 },
	);
});

for (const pairs of ["nearby", "random"] as const) {
	describe(`scattered icons, ${pairs} pairs`, () => {
		for (const count of [25, 50, 100]) {
			const { nodes, edges } = scatteredIcons(count, pairs);
			bench(
				`${count} nodes, ${edges.length} edges`,
				() => {
					routeEdgesAroundNodes(nodes, edges);
				},
				{ iterations: count >= 100 ? 3 : 5, warmupIterations: 1 },
			);
		}
	});
}

describe("scattered icons, nearby pairs, a label on every edge", () => {
	const { nodes, edges } = scatteredIcons(100, "nearby");
	const labelled = edges.map((edge): RoutableEdge => ({
		...edge,
		label: { width: 60, height: 18 },
	}));
	bench(
		`${nodes.length} nodes, ${labelled.length} edges`,
		() => {
			routeEdgesAroundNodes(nodes, labelled);
		},
		{ iterations: 3, warmupIterations: 1 },
	);
});

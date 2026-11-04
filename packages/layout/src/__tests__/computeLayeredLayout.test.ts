import { describe, expect, it } from "vitest";

import { computeLayeredLayout } from "../computeLayeredLayout";

const box = (id: string) => ({ id, width: 160, height: 80 });

describe("computeLayeredLayout", () => {
	it("stacks a chain top to bottom with the rank gap between boxes", () => {
		const result = computeLayeredLayout(
			[box("a"), box("b"), box("c")],
			[
				{ id: "e1", sourceId: "a", targetId: "b" },
				{ id: "e2", sourceId: "b", targetId: "c" },
			],
			{ rankSpacing: 60 },
		);

		const [a, b, c] = result.nodes.map(({ bounds }) => bounds);
		expect(a).toEqual({ x: 0, y: 0, width: 160, height: 80 });
		expect(b).toEqual({ x: 0, y: 140, width: 160, height: 80 });
		expect(c).toEqual({ x: 0, y: 280, width: 160, height: 80 });
		expect(result.edges.map(({ source, target }) => [source, target])).toEqual([
			[
				{ side: "bottom", t: 0.5 },
				{ side: "top", t: 0.5 },
			],
			[
				{ side: "bottom", t: 0.5 },
				{ side: "top", t: 0.5 },
			],
		]);
		// One column, so no corner is needed anywhere.
		expect(result.edges.map(({ points }) => points)).toEqual([[], []]);
	});

	it("lays a chain out left to right and faces the edges accordingly", () => {
		const result = computeLayeredLayout(
			[box("a"), box("b")],
			[{ id: "e1", sourceId: "a", targetId: "b" }],
			{ direction: "LR", rankSpacing: 100 },
		);

		expect(result.nodes[1].bounds).toEqual({
			x: 260,
			y: 0,
			width: 160,
			height: 80,
		});
		expect(result.edges[0]).toMatchObject({
			source: { side: "right", t: 0.5 },
			target: { side: "left", t: 0.5 },
		});
	});

	it("puts siblings of one rank side by side with the node gap", () => {
		const result = computeLayeredLayout(
			[box("root"), box("left"), box("right")],
			[
				{ id: "e1", sourceId: "root", targetId: "left" },
				{ id: "e2", sourceId: "root", targetId: "right" },
			],
			{ nodeSpacing: 40 },
		);

		const byId = new Map(result.nodes.map(({ id, bounds }) => [id, bounds]));
		expect(byId.get("left")?.y).toBe(byId.get("right")?.y);
		expect(
			Math.abs((byId.get("right")?.x ?? 0) - (byId.get("left")?.x ?? 0)),
		).toBe(200);
	});

	it("keeps a cycle laid out and faces the back edge upward", () => {
		const result = computeLayeredLayout(
			[box("a"), box("b")],
			[
				{ id: "down", sourceId: "a", targetId: "b" },
				{ id: "back", sourceId: "b", targetId: "a" },
			],
		);

		const back = result.edges.find(({ id }) => id === "back");
		expect(back).toMatchObject({
			source: { side: "top" },
			target: { side: "bottom" },
		});
	});

	it("leaves a self loop out of the edges and places lone nodes too", () => {
		const result = computeLayeredLayout(
			[box("a"), box("alone")],
			[{ id: "loop", sourceId: "a", targetId: "a" }],
		);

		expect(result.edges).toEqual([]);
		expect(result.nodes).toHaveLength(2);
	});

	it("routes an edge spanning two ranks around the rank between, in right angles", () => {
		// a and c are narrow, so the slot beside b lies off both their sides.
		const narrow = (id: string) => ({ id, width: 40, height: 40 });
		const result = computeLayeredLayout(
			[narrow("a"), box("b"), narrow("c")],
			[
				{ id: "ab", sourceId: "a", targetId: "b" },
				{ id: "bc", sourceId: "b", targetId: "c" },
				{ id: "ac", sourceId: "a", targetId: "c" },
			],
			{ nodeSpacing: 80, rankSpacing: 80 },
		);

		const byId = new Map(result.edges.map((edge) => [edge.id, edge]));
		const ac = byId.get("ac");
		// a → c steps aside in the gap below a, passes b's rank beside it, and steps back
		// in the gap above c: every segment is horizontal or vertical.
		const corners = ac?.points ?? [];
		expect(corners.length).toBeGreaterThanOrEqual(2);
		const a = result.nodes.find(({ id }) => id === "a")?.bounds;
		const c = result.nodes.find(({ id }) => id === "c")?.bounds;
		const path = [
			{ x: (a?.x ?? 0) + 40 * (ac?.source.t ?? 0), y: (a?.y ?? 0) + 40 },
			...corners,
			{ x: (c?.x ?? 0) + 40 * (ac?.target.t ?? 0), y: c?.y ?? 0 },
		];
		for (let index = 1; index < path.length; index += 1) {
			const turnsRightAngle =
				path[index - 1].x === path[index].x ||
				path[index - 1].y === path[index].y;
			expect(turnsRightAngle).toBe(true);
		}
	});

	it("runs an edge spanning two ranks straight when its slot crosses both sides", () => {
		const result = computeLayeredLayout(
			[box("a"), box("b"), box("c")],
			[
				{ id: "ab", sourceId: "a", targetId: "b" },
				{ id: "bc", sourceId: "b", targetId: "c" },
				{ id: "ac", sourceId: "a", targetId: "c" },
			],
			{ nodeSpacing: 80, rankSpacing: 80 },
		);

		expect(result.edges.find(({ id }) => id === "ac")?.points).toEqual([]);
	});

	it("runs a lone edge straight when the target's centre crosses the source's side", () => {
		// b is narrower than a and placed beside a's centre by the wider rank above.
		const result = computeLayeredLayout(
			[box("a"), { id: "b", width: 60, height: 40 }, box("c")],
			[
				{ id: "ab", sourceId: "a", targetId: "b" },
				{ id: "ac", sourceId: "a", targetId: "c" },
			],
			{ nodeSpacing: 20 },
		);

		const ab = result.edges.find(({ id }) => id === "ab");
		const a = result.nodes.find(({ id }) => id === "a")?.bounds;
		const b = result.nodes.find(({ id }) => id === "b")?.bounds;
		// b's centre lies over a's bottom side, so the edge leaves a right above it and
		// enters b at its midpoint: a straight line, no corner.
		expect(ab?.target.t).toBe(0.5);
		expect((a?.x ?? 0) + 160 * (ab?.source.t ?? 0)).toBeCloseTo(
			(b?.x ?? 0) + 30,
			6,
		);
		expect(ab?.points).toEqual([]);
	});

	it("centres the only edge on a side when no straight line is possible", () => {
		const result = computeLayeredLayout(
			[box("root"), box("left"), box("right")],
			[
				{ id: "e1", sourceId: "root", targetId: "left" },
				{ id: "e2", sourceId: "root", targetId: "right" },
			],
			{ nodeSpacing: 200 },
		);

		// Each child's top holds one edge, and root's centre is far off it: midpoint.
		expect(result.edges.map(({ target }) => target.t)).toEqual([0.5, 0.5]);
		// Root's bottom holds both, each leaning toward its child.
		expect(result.edges.map(({ source }) => source.t).sort()).toEqual([
			0.2, 0.8,
		]);
	});

	it("keeps room for a label in the gap it crosses and says where on the route it sits", () => {
		const result = computeLayeredLayout(
			[box("a"), box("b")],
			[
				{
					id: "e",
					sourceId: "a",
					targetId: "b",
					label: { width: 60, height: 30 },
				},
			],
			{ rankSpacing: 60 },
		);

		const b = result.nodes.find(({ id }) => id === "b")?.bounds;
		// The gap grew by the label's height, so the label never touches a box.
		expect(b?.y).toBe(80 + 60 + 30);
		const position = result.edges[0].labelPosition ?? NaN;
		expect(position).toBeGreaterThan(0);
		expect(position).toBeLessThan(1);
		expect(result.edges[0].labelPosition).toBeCloseTo(0.5, 5);
	});

	it("rejects an edge naming a node that is not there", () => {
		expect(() =>
			computeLayeredLayout(
				[box("a")],
				[{ id: "e", sourceId: "a", targetId: "ghost" }],
			),
		).toThrow("unknown node: ghost");
	});
});

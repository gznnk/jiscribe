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
		expect(
			result.edges.map(({ sourceSide, targetSide }) => [
				sourceSide,
				targetSide,
			]),
		).toEqual([
			["bottom", "top"],
			["bottom", "top"],
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
			sourceSide: "right",
			targetSide: "left",
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
		expect(back).toMatchObject({ sourceSide: "top", targetSide: "bottom" });
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
		const result = computeLayeredLayout(
			[box("a"), box("b"), box("c")],
			[
				{ id: "ab", sourceId: "a", targetId: "b" },
				{ id: "bc", sourceId: "b", targetId: "c" },
				{ id: "ac", sourceId: "a", targetId: "c" },
			],
			{ nodeSpacing: 80, rankSpacing: 80 },
		);

		const byId = new Map(result.edges.map((edge) => [edge.id, edge]));
		// a → c steps aside in the gap below a, passes b's rank beside it, and steps back
		// in the gap above c: every segment is horizontal or vertical.
		const corners = byId.get("ac")?.points ?? [];
		expect(corners.length).toBeGreaterThanOrEqual(2);
		const a = result.nodes.find(({ id }) => id === "a")?.bounds;
		const c = result.nodes.find(({ id }) => id === "c")?.bounds;
		const path = [
			{ x: (a?.x ?? 0) + 80, y: (a?.y ?? 0) + 80 },
			...corners,
			{ x: (c?.x ?? 0) + 80, y: c?.y ?? 0 },
		];
		for (let index = 1; index < path.length; index += 1) {
			const turnsRightAngle =
				path[index - 1].x === path[index].x ||
				path[index - 1].y === path[index].y;
			expect(turnsRightAngle).toBe(true);
		}
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

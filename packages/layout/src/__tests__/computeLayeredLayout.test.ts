import type { Rect } from "@jiscribe/geometry";
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

	it("runs two edges between the same boxes side by side", () => {
		const result = computeLayeredLayout(
			[box("a"), box("b")],
			[
				{ id: "down", sourceId: "a", targetId: "b" },
				{ id: "back", sourceId: "b", targetId: "a" },
			],
		);

		const byId = new Map(result.edges.map((edge) => [edge.id, edge]));
		const down = byId.get("down");
		const back = byId.get("back");
		// Each is still a straight line, EDGE_BUNDLE_SPACING to one side of the shared column.
		expect(down?.points).toEqual([]);
		expect(back?.points).toEqual([]);
		expect(down?.source.t).toBe(down?.target.t);
		expect(
			Math.abs(((down?.source.t ?? 0) - (back?.target.t ?? 0)) * 160),
		).toBeCloseTo(20, 6);
	});

	it("fits a labelled bundle on its side and staggers the labels", () => {
		const label = { width: 120, height: 24 };
		const result = computeLayeredLayout(
			[
				{ id: "a", width: 140, height: 70 },
				{ id: "b", width: 140, height: 70 },
			],
			[
				{ id: "one", sourceId: "a", targetId: "b", label },
				{ id: "two", sourceId: "a", targetId: "b", label },
				{ id: "three", sourceId: "b", targetId: "a", label },
			],
			{ direction: "LR" },
		);

		for (const { source, target } of result.edges) {
			expect(source.t).toBeGreaterThanOrEqual(0.09);
			expect(source.t).toBeLessThanOrEqual(0.91);
			expect(target.t).toBeGreaterThanOrEqual(0.09);
			expect(target.t).toBeLessThanOrEqual(0.91);
		}
		// Measured from a's side, the three labels sit at different spots.
		const positions = result.edges.map(({ id, labelPosition }) =>
			id === "three" ? 1 - (labelPosition ?? 0) : labelPosition,
		);
		expect(new Set(positions).size).toBe(3);
	});

	it("keeps a container's members inside it and routes an edge into it in right angles", () => {
		const result = computeLayeredLayout(
			[
				box("outside"),
				{ ...box("first"), parentId: "vpc" },
				{ ...box("second"), parentId: "vpc" },
			],
			[
				{ id: "in", sourceId: "outside", targetId: "first" },
				{ id: "within", sourceId: "first", targetId: "second" },
			],
			{ nodeSpacing: 40, rankSpacing: 60 },
			[{ id: "vpc" }],
		);

		const container = result.containers.find(({ id }) => id === "vpc")
			?.bounds as Rect;
		const within = (inner: Rect) =>
			inner.x > container.x &&
			inner.y > container.y &&
			inner.x + inner.width < container.x + container.width &&
			inner.y + inner.height < container.y + container.height;
		const byId = new Map(result.nodes.map(({ id, bounds }) => [id, bounds]));
		expect(within(byId.get("first") as Rect)).toBe(true);
		expect(within(byId.get("second") as Rect)).toBe(true);
		expect(within(byId.get("outside") as Rect)).toBe(false);
		// The edge from outside crosses the container's top border; its route is right-angled.
		const inEdge = result.edges.find(({ id }) => id === "in");
		const outside = byId.get("outside") as Rect;
		const first = byId.get("first") as Rect;
		const path = [
			{
				x: outside.x + outside.width * (inEdge?.source.t ?? 0),
				y: outside.y + outside.height,
			},
			...(inEdge?.points ?? []),
			{ x: first.x + first.width * (inEdge?.target.t ?? 0), y: first.y },
		];
		for (let index = 1; index < path.length; index += 1) {
			const turnsRightAngle =
				Math.abs(path[index - 1].x - path[index].x) < 1e-6 ||
				Math.abs(path[index - 1].y - path[index].y) < 1e-6;
			expect(turnsRightAngle).toBe(true);
		}
	});

	it("keeps a container's title band clear of its members, moving what lies below", () => {
		const plain = computeLayeredLayout(
			[{ ...box("a"), parentId: "f" }, box("b")],
			[{ id: "ab", sourceId: "a", targetId: "b" }],
			{ rankSpacing: 60 },
			[{ id: "f" }],
		);
		const titled = computeLayeredLayout(
			[{ ...box("a"), parentId: "f" }, box("b")],
			[{ id: "ab", sourceId: "a", targetId: "b" }],
			{ rankSpacing: 60 },
			[{ id: "f", titleHeight: 30 }],
		);

		const containerOf = (result: typeof plain) => result.containers[0].bounds;
		const nodeOf = (result: typeof plain, id: string) =>
			result.nodes.find((node) => node.id === id)?.bounds as Rect;
		// The container's top edge stays; its member and the node below both move down by
		// the band, and the container grows by it.
		expect(containerOf(titled).y).toBe(containerOf(plain).y);
		expect(containerOf(titled).height).toBe(containerOf(plain).height + 30);
		expect(nodeOf(titled, "a").y).toBe(nodeOf(plain, "a").y + 30);
		expect(nodeOf(titled, "b").y).toBe(nodeOf(plain, "b").y + 30);
		expect(
			nodeOf(titled, "a").y - containerOf(titled).y,
		).toBeGreaterThanOrEqual(30);
	});

	it("refuses a container that holds nothing", () => {
		expect(() =>
			computeLayeredLayout([box("a"), box("b")], [], {}, [{ id: "empty" }]),
		).toThrow("container empty holds nothing");
	});

	it("refuses an edge that ends on a container", () => {
		expect(() =>
			computeLayeredLayout(
				[{ ...box("a"), parentId: "f" }],
				[{ id: "e", sourceId: "a", targetId: "f" }],
				{},
				[{ id: "f" }],
			),
		).toThrow("ends on a container: f");
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

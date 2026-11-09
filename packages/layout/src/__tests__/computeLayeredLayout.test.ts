import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { calcAnchorPoint } from "../calcOrthogonalPath";
import { computeLayeredLayout } from "../computeLayeredLayout";
import type { LaidOutEdge } from "../types";

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

	it("leaves a column outside a side's usable stretch instead of running straight to it", () => {
		// The same drawing as above, but a's bottom only reaches from 0.11 to 0.89 (a
		// parallelogram's): both columns fall outside it, so both ends fan out, to the
		// ends of EDGE_ANCHOR_FAN_RANGE, which the stretch holds whole.
		const usable = { min: 0.11, max: 0.89 };
		const result = computeLayeredLayout(
			[
				{ ...box("a"), anchorRanges: { bottom: usable } },
				{ id: "b", width: 60, height: 40 },
				box("c"),
			],
			[
				{ id: "ab", sourceId: "a", targetId: "b" },
				{ id: "ac", sourceId: "a", targetId: "c" },
			],
			{ nodeSpacing: 20 },
		);

		const ab = result.edges.find(({ id }) => id === "ab");
		const ac = result.edges.find(({ id }) => id === "ac");
		expect(ab?.source.t).toBe(0.8);
		expect(ac?.source.t).toBe(0.2);
		expect(ab?.points.length).toBeGreaterThan(0);
	});

	it("centres a side's only edge on its usable stretch when that leaves out the side's middle, and runs the other end straight to it", () => {
		// b's left side is usable below its middle only.
		const result = computeLayeredLayout(
			[
				box("a"),
				{ ...box("b"), anchorRanges: { left: { min: 0.55, max: 1 } } },
			],
			[{ id: "ab", sourceId: "a", targetId: "b" }],
			{ direction: "LR" },
		);

		const [a, b] = result.nodes.map(({ bounds }) => bounds);
		const [ab] = result.edges;
		expect(ab.target).toEqual({ side: "left", t: 0.775 });
		expect(a.y + a.height * ab.source.t).toBeCloseTo(
			b.y + b.height * ab.target.t,
			9,
		);
		expect(ab.points).toEqual([]);
	});

	it("centres the only edge on a side on its usable stretch when no straight line is possible and the stretch leaves out the side's middle", () => {
		const usable = { min: 0.55, max: 1 };
		const result = computeLayeredLayout(
			[
				box("root"),
				{ ...box("left"), anchorRanges: { top: usable } },
				{ ...box("right"), anchorRanges: { top: usable } },
			],
			[
				{ id: "e1", sourceId: "root", targetId: "left" },
				{ id: "e2", sourceId: "root", targetId: "right" },
			],
			{ nodeSpacing: 200 },
		);

		expect(result.edges.map(({ target }) => target.t)).toEqual([0.775, 0.775]);
	});

	it("keeps the only edge on a side at the side's middle when the usable stretch holds it, however lopsided", () => {
		const usable = { min: 0, max: 0.875 };
		const result = computeLayeredLayout(
			[
				box("root"),
				{ ...box("left"), anchorRanges: { top: usable } },
				{ ...box("right"), anchorRanges: { top: usable } },
			],
			[
				{ id: "e1", sourceId: "root", targetId: "left" },
				{ id: "e2", sourceId: "root", targetId: "right" },
			],
			{ nodeSpacing: 200 },
		);

		expect(result.edges.map(({ target }) => target.t)).toEqual([0.5, 0.5]);
	});

	it("centres the only edge on a side on the usable stretch when that does not hold the side's middle", () => {
		const usable = { min: 0.6, max: 1 };
		const result = computeLayeredLayout(
			[
				box("root"),
				{ ...box("left"), anchorRanges: { top: usable } },
				{ ...box("right"), anchorRanges: { top: usable } },
			],
			[
				{ id: "e1", sourceId: "root", targetId: "left" },
				{ id: "e2", sourceId: "root", targetId: "right" },
			],
			{ nodeSpacing: 200 },
		);

		expect(result.edges.map(({ target }) => target.t)).toEqual([0.8, 0.8]);
	});

	it("keeps a side's only end between neighbouring ranks at the side's middle when the usable stretch holds it, and runs the other end straight to it", () => {
		const result = computeLayeredLayout(
			[
				box("a"),
				{ ...box("b"), anchorRanges: { left: { min: 0, max: 0.875 } } },
			],
			[{ id: "ab", sourceId: "a", targetId: "b" }],
			{ direction: "LR" },
		);

		const [a, b] = result.nodes.map(({ bounds }) => bounds);
		const [ab] = result.edges;
		expect(ab.target).toEqual({ side: "left", t: 0.5 });
		expect(a.y + a.height * ab.source.t).toBeCloseTo(
			b.y + b.height * ab.target.t,
			9,
		);
		expect(ab.points).toEqual([]);
	});

	it("fans several edges out over the part of EDGE_ANCHOR_FAN_RANGE the usable stretch holds", () => {
		const result = computeLayeredLayout(
			[
				{ ...box("root"), anchorRanges: { bottom: { min: 0.3, max: 0.7 } } },
				box("left"),
				box("right"),
			],
			[
				{ id: "e1", sourceId: "root", targetId: "left" },
				{ id: "e2", sourceId: "root", targetId: "right" },
			],
			{ nodeSpacing: 200 },
		);

		const sourceRatios = result.edges.map(({ source }) => source.t).sort();
		// 0.2..0.8 cut down to 0.3..0.7.
		expect(sourceRatios).toEqual([0.3, 0.7]);
	});

	it("fans several edges out over EDGE_ANCHOR_FAN_RANGE of the usable stretch when the two do not meet", () => {
		// Wide enough that the two fanned ends stay an end spacing apart.
		const result = computeLayeredLayout(
			[
				{
					id: "root",
					width: 400,
					height: 80,
					anchorRanges: { bottom: { min: 0.85, max: 1 } },
				},
				box("left"),
				box("right"),
			],
			[
				{ id: "e1", sourceId: "root", targetId: "left" },
				{ id: "e2", sourceId: "root", targetId: "right" },
			],
			{ nodeSpacing: 400 },
		);

		const sourceRatios = result.edges.map(({ source }) => source.t).sort();
		// EDGE_ANCHOR_FAN_RANGE taken as shares of 0.85..1.
		expect(sourceRatios[0]).toBeCloseTo(0.88, 9);
		expect(sourceRatios[1]).toBeCloseTo(0.97, 9);
	});

	it("centres a side's only edge on the side's body and fans several out over it", () => {
		// The left child's top body covers 0.25..1 (a loop limit's sides below the cut,
		// turned to face up); the root's bottom body likewise.
		const body = { min: 0.25, max: 1 };
		const result = computeLayeredLayout(
			[
				{ ...box("root"), anchorBodyRanges: { bottom: body } },
				{ ...box("left"), anchorBodyRanges: { top: body } },
				box("right"),
			],
			[
				{ id: "e1", sourceId: "root", targetId: "left" },
				{ id: "e2", sourceId: "root", targetId: "right" },
			],
			{ nodeSpacing: 200 },
		);

		const [e1, e2] = result.edges;
		expect(e1.target.t).toBe(0.625);
		// EDGE_ANCHOR_FAN_RANGE taken as shares of 0.25..1.
		const sourceRatios = [e1.source.t, e2.source.t].sort(
			(first, second) => first - second,
		);
		expect(sourceRatios[0]).toBeCloseTo(0.4, 9);
		expect(sourceRatios[1]).toBeCloseTo(0.85, 9);
	});

	it("keeps a bundle's ends inside the side's usable stretch", () => {
		const usable = { min: 0.5, max: 0.55 };
		const result = computeLayeredLayout(
			[{ ...box("a"), anchorRanges: { bottom: usable } }, box("b")],
			[
				{ id: "down", sourceId: "a", targetId: "b" },
				{ id: "back", sourceId: "b", targetId: "a" },
			],
		);

		for (const edge of result.edges) {
			const onA = edge.id === "down" ? edge.source : edge.target;
			expect(onA.side).toBe("bottom");
			expect(onA.t).toBeGreaterThanOrEqual(usable.min);
			expect(onA.t).toBeLessThanOrEqual(usable.max);
		}
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

	it("keeps a bundle's ends on a side with no extent free of NaN", () => {
		const result = computeLayeredLayout(
			[
				{ id: "a", width: 0, height: 1 },
				{ id: "b", width: 45, height: 80 },
			],
			[
				{ id: "e1", sourceId: "a", targetId: "b" },
				{ id: "e2", sourceId: "a", targetId: "b" },
			],
		);

		for (const { source, target, points } of result.edges) {
			expect(Number.isFinite(source.t)).toBe(true);
			expect(Number.isFinite(target.t)).toBe(true);
			for (const { x, y } of points) {
				expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
			}
		}
	});

	it("lays out boxes with no extent without dagre refusing them", () => {
		const result = computeLayeredLayout(
			[
				{ id: "n0", width: 1, height: 80 },
				{ id: "n19", width: 160, height: 40, parentId: "c0" },
				{ id: "n21", width: 0, height: 0 },
			],
			[{ id: "e", sourceId: "n0", targetId: "n21" }],
			{ direction: "RL", rankSpacing: 0 },
			[{ id: "c0" }],
		);

		expect(result.nodes.find(({ id }) => id === "n21")?.bounds).toMatchObject({
			width: 0,
			height: 0,
		});
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

describe("computeLayeredLayout with visual margins", () => {
	/** A 64px icon with a caption hung below it, 40px tall and 184px wide. */
	const captioned = (id: string, parentId?: string) => ({
		id,
		width: 64,
		height: 64,
		visualMargin: { bottom: 40, left: 60, right: 60 },
		...(parentId !== undefined ? { parentId } : {}),
	});
	const grown = (
		bounds: Rect,
		margin = { bottom: 40, left: 60, right: 60 },
	) => ({
		x: bounds.x - margin.left,
		y: bounds.y,
		width: bounds.width + margin.left + margin.right,
		height: bounds.height + margin.bottom,
	});
	const boundsOf = (result: ReturnType<typeof computeLayeredLayout>) =>
		new Map(result.nodes.map(({ id, bounds }) => [id, bounds]));
	/** The whole route of an edge, both ends included. */
	const pathOf = (
		result: ReturnType<typeof computeLayeredLayout>,
		edgeId: string,
		sourceId: string,
		targetId: string,
	) => {
		const edge = result.edges.find(({ id }) => id === edgeId) as LaidOutEdge;
		const bounds = boundsOf(result);
		return [
			calcAnchorPoint(bounds.get(sourceId) as Rect, edge.source),
			...edge.points,
			calcAnchorPoint(bounds.get(targetId) as Rect, edge.target),
		];
	};
	const fan = [
		{ id: "ab", sourceId: "a", targetId: "b" },
		{ id: "ac", sourceId: "a", targetId: "c" },
		{ id: "ad", sourceId: "a", targetId: "d" },
	];

	it("keeps each node's margin a node gap from its neighbours and a rank gap from the next rank", () => {
		const result = computeLayeredLayout(
			[captioned("a"), captioned("b"), box("c"), captioned("d")],
			fan,
			{ nodeSpacing: 80, rankSpacing: 80 },
		);

		const bounds = boundsOf(result);
		const rank = ["b", "c", "d"]
			.map((id) =>
				id === "c" ? (bounds.get(id) as Rect) : grown(bounds.get(id) as Rect),
			)
			.sort((left, right) => left.x - right.x);
		for (let index = 1; index < rank.length; index += 1) {
			const previous = rank[index - 1];
			expect(rank[index].x - (previous.x + previous.width)).toBe(80);
		}
		const a = grown(bounds.get("a") as Rect);
		expect(
			Math.min(...rank.map(({ y }) => y)) - (a.y + a.height),
		).toBeGreaterThanOrEqual(80);
	});

	it("lines a rank's boxes up on their centres, whatever margins they carry", () => {
		const result = computeLayeredLayout(
			[box("a"), captioned("b"), box("c")],
			[
				{ id: "ab", sourceId: "a", targetId: "b" },
				{ id: "ac", sourceId: "a", targetId: "c" },
			],
		);

		const bounds = boundsOf(result);
		const b = bounds.get("b") as Rect;
		const c = bounds.get("c") as Rect;
		expect(b.y + b.height / 2).toBe(c.y + c.height / 2);
	});

	it("stacks the nodes of a rank by their margins across it, left to right", () => {
		const result = computeLayeredLayout(
			[captioned("a"), captioned("b"), box("c"), captioned("d")],
			fan,
			{ direction: "LR", nodeSpacing: 80 },
		);

		const bounds = boundsOf(result);
		const rank = ["b", "c", "d"]
			.map((id) =>
				id === "c" ? (bounds.get(id) as Rect) : grown(bounds.get(id) as Rect),
			)
			.sort((upper, lower) => upper.y - lower.y);
		for (let index = 1; index < rank.length; index += 1) {
			const previous = rank[index - 1];
			expect(rank[index].y - (previous.y + previous.height)).toBe(80);
		}
		// The boxes and containers start at the origin; a margin may reach past it.
		expect(Math.min(...result.nodes.map(({ bounds: { x } }) => x))).toBe(0);
		expect(Math.min(...result.nodes.map(({ bounds: { y } }) => y))).toBe(0);
	});

	it("sizes a container around its members' margins", () => {
		const result = computeLayeredLayout(
			[captioned("a", "vpc"), captioned("b", "vpc"), captioned("c", "vpc")],
			[
				{ id: "ab", sourceId: "a", targetId: "b" },
				{ id: "ac", sourceId: "a", targetId: "c" },
			],
			{},
			[{ id: "vpc", titleHeight: 24 }],
		);

		const container = result.containers[0].bounds;
		for (const { bounds } of result.nodes) {
			const drawn = grown(bounds);
			expect(drawn.x).toBeGreaterThan(container.x);
			expect(drawn.y).toBeGreaterThan(container.y);
			expect(drawn.x + drawn.width).toBeLessThan(container.x + container.width);
			expect(drawn.y + drawn.height).toBeLessThan(
				container.y + container.height,
			);
		}
	});

	it("ends the edges on the box and bends them only past the margin of the side they leave", () => {
		const result = computeLayeredLayout(
			["a", "b", "c", "d"].map((id) => captioned(id)),
			fan,
		);

		const a = boundsOf(result).get("a") as Rect;
		for (const { id, targetId } of fan) {
			const edge = result.edges.find((laidOut) => laidOut.id === id);
			expect(edge?.source.side).toBe("bottom");
			const path = pathOf(result, id, "a", targetId);
			expect(path[0].y).toBe(a.y + a.height);
			for (const corner of edge?.points ?? []) {
				expect(corner.y).toBeGreaterThan(a.y + a.height + 40);
			}
		}
	});

	it("keeps the lanes through a gap a stub's length past a margin facing it", () => {
		// The edges from a overlap sideways in the gap below it and take two lanes. The
		// tall node beside b and c leaves their tops far below the gap's midline, so only
		// a's margin holds the lanes back.
		const result = computeLayeredLayout(
			[
				captioned("a"),
				box("b"),
				box("c"),
				box("z"),
				{ id: "tall", width: 160, height: 240 },
			],
			[
				{ id: "ab", sourceId: "a", targetId: "b" },
				{ id: "ac", sourceId: "a", targetId: "c" },
				{ id: "ab2", sourceId: "a", targetId: "b" },
				{ id: "zt", sourceId: "z", targetId: "tall" },
			],
			{ rankSpacing: 40 },
		);

		const a = boundsOf(result).get("a") as Rect;
		const corners = result.edges
			.filter(({ id }) => id !== "zt")
			.flatMap(({ points }) => points);
		expect(new Set(corners.map(({ y }) => y)).size).toBeGreaterThan(1);
		for (const corner of corners) {
			expect(corner.y - (a.y + a.height + 40)).toBeGreaterThanOrEqual(24);
		}
	});

	it("keeps a label off the stretch an end runs through its own node's margin", () => {
		const label = { width: 30, height: 18 };
		const result = computeLayeredLayout(
			[captioned("a"), box("b")],
			[
				{ id: "one", sourceId: "a", targetId: "b", label },
				{ id: "two", sourceId: "a", targetId: "b", label },
			],
		);

		// A bundle staggers its labels about the middle of what is left past the margin.
		const positionsPastMargin = result.edges.map(({ id, labelPosition }) => {
			const path = pathOf(result, id, "a", "b");
			const length = path
				.slice(1)
				.reduce(
					(sum, end, index) =>
						sum +
						Math.abs(end.x - path[index].x) +
						Math.abs(end.y - path[index].y),
					0,
				);
			return ((labelPosition ?? 0) * length - 40) / (length - 40);
		});
		expect(positionsPastMargin[0]).toBeCloseTo(0.425, 9);
		expect(positionsPastMargin[1]).toBeCloseTo(0.575, 9);
	});

	it("lays out a node whose margin is 0 on every side as one given none", () => {
		const zero = { top: 0, right: 0, bottom: 0, left: 0 };
		const nodes = [box("a"), box("b"), box("c")];
		const edges = [
			{
				id: "ab",
				sourceId: "a",
				targetId: "b",
				label: { width: 40, height: 20 },
			},
			{ id: "ac", sourceId: "a", targetId: "c" },
			{ id: "bc", sourceId: "b", targetId: "c" },
		];

		expect(
			computeLayeredLayout(
				nodes.map((node) => ({ ...node, visualMargin: zero })),
				edges,
			),
		).toEqual(computeLayeredLayout(nodes, edges));
	});

	it("refuses a margin that is negative or not a finite number", () => {
		expect(() =>
			computeLayeredLayout(
				[{ ...box("a"), visualMargin: { bottom: -1 } }, box("b")],
				[],
			),
		).toThrow("node a has a visualMargin.bottom");
		expect(() =>
			computeLayeredLayout(
				[{ ...box("a"), visualMargin: { left: Number.NaN } }, box("b")],
				[],
			),
		).toThrow("node a has a visualMargin.left");
	});
});

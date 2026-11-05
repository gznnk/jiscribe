import type { Rect } from "@jiscribe/geometry";
import { describe, expect, it } from "vitest";

import { type EdgeToAnchor, chooseEdgeAnchors } from "../chooseEdgeAnchors";
import { createLayoutAxis } from "../LayoutAxis";
import { createRowIndex } from "../RowIndex";

const axis = createLayoutAxis("LR");
// No node rows, so every edge reads as one between neighbouring ranks.
const rows = createRowIndex([], [], axis);

const at = (x: number, y: number, height = 64): Rect => ({
	x,
	y,
	width: 64,
	height,
});

const link = (
	id: string,
	[sourceId, sourceBounds]: readonly [string, Rect],
	[targetId, targetBounds]: readonly [string, Rect],
): EdgeToAnchor => ({
	edge: { id, sourceId, targetId },
	sourceBounds,
	targetBounds,
	points: [],
});

/** Where an end sits across the rank axis, in px. */
const columnOf = (bounds: Rect, t: number): number =>
	bounds.y + t * bounds.height;

describe("chooseEdgeAnchors", () => {
	// g's right and p's left are each shared with another edge; p sits 10px lower.
	const g = ["g", at(0, 0)] as const;
	const p = ["p", at(200, 10)] as const;
	const sql = ["sql", at(200, 150)] as const;

	it("runs an edge between two shared sides straight, on a column set by each end's rank", () => {
		const r = ["r", at(0, 140)] as const;
		const [gp, gs] = chooseEdgeAnchors(
			[link("gp", g, p), link("gs", g, sql), link("rp", r, p)],
			rows,
			axis,
		);

		// First of two on both sides: the mean of g's 1/3 and p's 1/3 in px.
		expect(columnOf(g[1], gp.source.t)).toBeCloseTo(
			(64 / 3 + 10 + 64 / 3) / 2,
			6,
		);
		expect(columnOf(p[1], gp.target.t)).toBeCloseTo(
			columnOf(g[1], gp.source.t),
			6,
		);
		// Far enough from gs's fanned end that nothing is pushed.
		expect(gs.source.t).toBe(0.8);
	});

	it("keeps the fanned ends when the two sides share no straight column", () => {
		const below = ["below", at(200, 100)] as const;
		const above = ["above", at(200, -100)] as const;
		const r = ["r", at(0, 200)] as const;
		const [gb] = chooseEdgeAnchors(
			[link("gb", g, below), link("ga", g, above), link("rb", r, below)],
			rows,
			axis,
		);

		expect([gb.source.t, gb.target.t]).toEqual([0.8, 0.2]);
	});

	it("keeps the old ends when the column would come within an end spacing of a neighbour", () => {
		// u's edge is fanned to 0.2 on p's left, ahead of g's in heading order.
		const u = ["u", at(0, -100)] as const;
		const [gp] = chooseEdgeAnchors(
			[link("gp", g, p), link("gs", g, sql), link("up", u, p)],
			rows,
			axis,
		);

		// Straight toward p's centre on g's side, as before; on p's side the end is
		// only spread clear of u's.
		expect(gp.source.t).toBe(42 / 64);
		expect(gp.target.t).toBeCloseTo(0.2 + 20 / 64, 6);
	});

	it("stops the column at the end of the straight range when the mean falls past it", () => {
		// g's 2/3 and the tall p's 1/3 average to 108px, past g's straight range.
		const tall = ["tall", at(200, 40, 400)] as const;
		const above = ["above", at(200, -200)] as const;
		const r = ["r", at(0, 600)] as const;
		const [gt] = chooseEdgeAnchors(
			[link("gt", g, tall), link("ga", g, above), link("rt", r, tall)],
			rows,
			axis,
		);

		expect(gt.source.t).toBe(0.95);
		expect(columnOf(tall[1], gt.target.t)).toBeCloseTo(0.95 * 64, 6);
	});

	it("keeps the old ends when spreading a crowded side would move the column's end", () => {
		// d1..d3 crowd g's right below gp, so spreading would pull a column end up
		// off the column; gp keeps its old ends instead (p's side left at the centre).
		const g100 = ["g", at(0, 0, 100)] as const;
		const p100 = ["p", at(200, 0, 100)] as const;
		const q = ["q", at(0, -300, 100)] as const;
		const [gp] = chooseEdgeAnchors(
			[
				link("gp", g100, p100),
				link("qp", q, p100),
				link("gd1", g100, ["d1", at(200, 400, 100)]),
				link("gd2", g100, ["d2", at(200, 500, 100)]),
				link("gd3", g100, ["d3", at(200, 600, 100)]),
			],
			rows,
			axis,
		);

		expect(gp.target.t).toBe(0.5);
	});

	it("keeps an edge off a column when spreading would move an end already put on one", () => {
		// l2r0 is decided after l0r0 but ranks before it on r0's left; taking its column
		// would push l0r0's end there off l0r0's column.
		const l0 = ["l0", at(0, 231, 122)] as const;
		const l2 = ["l2", at(0, 200, 132)] as const;
		const l3 = ["l3", at(0, 253, 43)] as const;
		const r0 = ["r0", at(200, 239, 122)] as const;
		const r1 = ["r1", at(200, 293, 62)] as const;
		const r2 = ["r2", at(200, 4, 41)] as const;
		const [, l0r0] = chooseEdgeAnchors(
			[
				link("l2r2", l2, r2),
				link("l0r0", l0, r0),
				link("l0r1", l0, r1),
				link("l3r1", l3, r1),
				link("l2r0", l2, r0),
			],
			rows,
			axis,
		);

		expect(columnOf(l0[1], l0r0.source.t)).toBeCloseTo(296, 6);
		expect(columnOf(r0[1], l0r0.target.t)).toBeCloseTo(296, 6);
	});
});

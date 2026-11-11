import type { ObjectDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { erEntityDocDefinition } from "../../doc";
import { calcErEntityConnectPoints } from "../../presentation/calcErEntityConnectPoints";
import { erEntityColumnConnectPointIds } from "../../schema/erEntityColumnIds";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import { calcErEntityConnectPointEdgeAnchors } from "../calcErEntityConnectPointEdgeAnchors";

const makeDoc = (columns: ErEntityDoc["columns"]): ErEntityDoc =>
	({
		id: "e-1",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 91,
		typeWidth: 100,
		name: "users",
		columns,
	}) as ErEntityDoc;

// The second column wraps onto two lines, so the rows are not of one height.
const COLUMNS: ErEntityDoc["columns"] = [
	{ key: "PK", name: "id", type: "bigint" },
	{ name: "billing\naddress", type: "text" },
	{ key: "FK", name: "org_id", type: "bigint" },
];

describe("calcErEntityConnectPointEdgeAnchors", () => {
	it("answers a left and a right anchor per column, in declared order, by the type's connect point ids", () => {
		const anchors = calcErEntityConnectPointEdgeAnchors(makeDoc(COLUMNS));

		expect(anchors.map(({ id }) => id)).toEqual(
			erEntityColumnConnectPointIds(COLUMNS.length),
		);
		expect(anchors.map(({ side }) => side)).toEqual([
			"left",
			"right",
			"left",
			"right",
			"left",
			"right",
		]);
	});

	it("places each anchor at its row's centre, where the canvas draws the connect point", () => {
		const doc = makeDoc(COLUMNS);
		const state = erEntityToState(doc);
		const drawnTById = new Map(
			calcErEntityConnectPoints(state).map(({ id, point }) => [
				id,
				(point.y + state.height / 2) / state.height,
			]),
		);

		const anchors = calcErEntityConnectPointEdgeAnchors(doc);

		for (const { id, t } of anchors) {
			expect(t).toBeCloseTo(drawnTById.get(id) as number, 10);
		}
		// Within the box, below the title, further down for each later column.
		const ts = anchors.filter(({ side }) => side === "left").map(({ t }) => t);
		expect(ts[0]).toBeGreaterThan(0);
		expect(ts[ts.length - 1]).toBeLessThan(1);
		expect([...ts].sort((a, b) => a - b)).toEqual(ts);
	});

	it("groups the two points of one column together, and no two columns", () => {
		const anchors = calcErEntityConnectPointEdgeAnchors(makeDoc(COLUMNS));
		const groups = [0, 1, 2].map((columnIndex) =>
			anchors
				.filter(({ id }) => id.startsWith(`col:${columnIndex}:`))
				.map(({ alternateGroup }) => alternateGroup),
		);

		for (const [left, right] of groups) {
			expect(left).toBeDefined();
			expect(right).toBe(left);
		}
		expect(new Set(groups.map(([left]) => left)).size).toBe(3);
	});

	it("answers none for an entity with no column", () => {
		expect(calcErEntityConnectPointEdgeAnchors(makeDoc([]))).toEqual([]);
	});
});

describe("erEntityDocDefinition.extraConnectPointEdgeAnchors", () => {
	it("anchors every connect point the type declares", () => {
		const doc = makeDoc(COLUMNS) as unknown as ObjectDoc;

		expect(
			erEntityDocDefinition
				.extraConnectPointEdgeAnchors?.(doc)
				.map(({ id }) => id),
		).toEqual(erEntityDocDefinition.extraConnectPointIds?.(doc));
	});
});

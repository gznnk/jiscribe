import type { CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import { validateDoc } from "../validateDoc";

/** Parse a document written out here, failing the test when it does not parse. */
const parseDoc = (root: object[]): CanvasDoc => {
	const result = validateDoc(JSON.stringify({ version: 1, root }));
	if (result.doc === undefined) {
		throw new Error(
			result.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
		);
	}
	return result.doc;
};

/** The arrowhead findings alone, so a test reads only what it is about. */
const diagnoseArrowHeads = (root: object[]) =>
	diagnoseDoc(parseDoc(root)).filter((diagnostic) =>
		diagnostic.message.includes("arrowhead covers the bend"),
	);

// a's right edge midpoint is (100, 30), b's left edge midpoint (300, 30); both
// bottom midpoints sit at y 60.
const a = { id: "a", type: "rect", x: 0, y: 0, width: 100, height: 60 };
const b = { id: "b", type: "rect", x: 300, y: 0, width: 100, height: 60 };

const end = (ownerId: string, connectPointId: string) => ({
	owner: { id: ownerId },
	anchor: { kind: "connectPoint", id: connectPointId },
});

/** Under a's and b's bottom edges and back up, bending `drop` px below each. */
const underBoth = (drop: number, fields: Record<string, unknown> = {}) => ({
	id: "line",
	type: "connector",
	source: end("a", "bottomCenter"),
	target: end("b", "bottomCenter"),
	routing: "orthogonal",
	points: [
		{ x: 50, y: 60 + drop },
		{ x: 350, y: 60 + drop },
	],
	...fields,
});

/** Straight from a's right edge to b's left edge through `points`. */
const straight = (points: object[], fields: Record<string, unknown> = {}) => ({
	id: "line",
	type: "connector",
	source: end("a", "rightCenter"),
	target: end("b", "leftCenter"),
	routing: "straight",
	points,
	...fields,
});

/** A polyline through `points` with a head on its last point. */
const polyline = (points: object[]) => ({
	id: "line",
	type: "polyline",
	points,
	endArrow: "FilledTriangle",
});

describe("diagnoseDoc on arrowheads drawn over a bend", () => {
	it("warns about a right-angled line bending closer to its end than the head is long", () => {
		expect(
			diagnoseArrowHeads([a, b, underBoth(10, { endArrow: "FilledTriangle" })]),
		).toEqual([
			{
				severity: "warning",
				objectId: "line",
				message:
					"endArrow (FilledTriangle) is drawn 18.0px back along the line, but the line bends 10.0px from its target end, so the arrowhead covers the bend: move that bend at least 18.0px from the end (update_connectors), or move the shapes further apart",
			},
		]);
	});

	it("passes over a bend at least the head's length from the end", () => {
		expect(
			diagnoseArrowHeads([a, b, underBoth(18, { endArrow: "FilledTriangle" })]),
		).toEqual([]);
	});

	it("looks only at the ends that carry a head of their own", () => {
		expect(
			diagnoseArrowHeads([
				a,
				b,
				underBoth(10, { startArrow: "OpenArrow" }),
			]).map((diagnostic) => diagnostic.message.split(" is drawn")[0]),
		).toEqual(["startArrow (OpenArrow)"]);
		expect(diagnoseArrowHeads([a, b, underBoth(10)])).toEqual([]);
		expect(
			diagnoseArrowHeads([a, b, underBoth(10, { endArrow: "None" })]),
		).toEqual([]);
	});

	it("sizes the head by the line's own stroke width and arrow scale", () => {
		// 9px at a stroke of 1: the 10px end segment holds it.
		expect(
			diagnoseArrowHeads([
				a,
				b,
				underBoth(10, { endArrow: "FilledTriangle", strokeWidth: 1 }),
			]),
		).toEqual([]);
		expect(
			diagnoseArrowHeads([
				a,
				b,
				underBoth(10, {
					endArrow: "FilledTriangle",
					strokeWidth: 1,
					arrowScale: 2,
				}),
			]).map((diagnostic) => diagnostic.message.split(", but")[0]),
		).toEqual([
			"endArrow (FilledTriangle) is drawn 18.0px back along the line",
		]);
	});

	it("measures a straight line to the vertex where it turns", () => {
		expect(
			diagnoseArrowHeads([
				a,
				b,
				straight([{ x: 295, y: 40 }], { endArrow: "FilledTriangle" }),
			]).map((diagnostic) => diagnostic.message.split(", so")[0]),
		).toEqual([
			"endArrow (FilledTriangle) is drawn 18.0px back along the line, but the line bends 11.2px from its target end",
		]);
	});

	it("measures past vertices lying on the end's own run", () => {
		expect(
			diagnoseArrowHeads([
				a,
				b,
				straight(
					[
						{ x: 200, y: 30 },
						{ x: 290, y: 30 },
					],
					{ endArrow: "FilledTriangle" },
				),
			]),
		).toEqual([]);
	});

	it("collapses a vertex lying on the connector's end, as the drawing does", () => {
		expect(
			diagnoseArrowHeads([
				a,
				b,
				straight(
					[
						{ x: 200, y: 100 },
						{ x: 300, y: 30 },
					],
					{ endArrow: "FilledTriangle" },
				),
			]),
		).toEqual([]);
	});

	it("resolves an end on a rotated owner where the rotation puts it", () => {
		// Turned a quarter, a's right edge midpoint is drawn at (50, 80).
		const rotated = { ...a, rotation: 90 };
		const line = straight(
			[
				{ x: 50, y: 90 },
				{ x: 200, y: 90 },
			],
			{ startArrow: "FilledTriangle" },
		);

		expect(
			diagnoseArrowHeads([rotated, b, line]).map(
				(diagnostic) => diagnostic.message.split(", so")[0],
			),
		).toEqual([
			"startArrow (FilledTriangle) is drawn 18.0px back along the line, but the line bends 10.0px from its source end",
		]);
		expect(diagnoseArrowHeads([a, b, line])).toEqual([]);
	});

	it("passes over a connector whose route the canvas chooses, and an end on a declared connect point", () => {
		const entity = {
			id: "users",
			type: "erEntity",
			x: 0,
			y: 0,
			name: "users",
			columns: [{ key: "PK", name: "id", type: "bigint" }],
		};

		expect(
			diagnoseArrowHeads([
				a,
				b,
				underBoth(10, { endArrow: "FilledTriangle", points: [] }),
			]),
		).toEqual([]);
		expect(
			diagnoseArrowHeads([
				entity,
				b,
				{
					id: "line",
					type: "connector",
					source: end("users", "col:0:right"),
					target: end("b", "bottomCenter"),
					points: [{ x: 350, y: 65 }],
					startArrow: "FilledTriangle",
					endArrow: "FilledTriangle",
				},
			]),
		).toEqual([]);
	});

	it("measures a polyline along its points", () => {
		expect(
			diagnoseArrowHeads([
				polyline([
					{ x: 0, y: 0 },
					{ x: 100, y: 0 },
					{ x: 100, y: 10 },
				]),
			]),
		).toEqual([
			{
				severity: "warning",
				objectId: "line",
				message:
					"endArrow (FilledTriangle) is drawn 18.0px back along the line, but the line bends 10.0px from its last point, so the arrowhead covers the bend: move that bend at least 18.0px from the end",
			},
		]);
		expect(
			diagnoseArrowHeads([
				polyline([
					{ x: 0, y: 0 },
					{ x: 50, y: 0 },
					{ x: 100, y: 0 },
				]),
			]),
		).toEqual([]);
	});

	it("collapses a point lying on the polyline's end, as the drawing does", () => {
		expect(
			diagnoseArrowHeads([
				polyline([
					{ x: 0, y: 0 },
					{ x: 100, y: 0 },
					{ x: 100, y: 0 },
				]),
			]),
		).toEqual([]);
		expect(
			diagnoseArrowHeads([
				polyline([
					{ x: 0, y: 0 },
					{ x: 100, y: 0 },
					{ x: 100, y: 10 },
					{ x: 100.3, y: 10 },
				]),
			]).map((diagnostic) => diagnostic.message.split(", so")[0]),
		).toEqual([
			"endArrow (FilledTriangle) is drawn 18.0px back along the line, but the line bends 10.0px from its last point",
		]);
	});
});

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../rendering/Viewport";
import { canvasToState } from "../../../states/canvas/CanvasMapper";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { calcViewportToRevealHistoryChange } from "../calcViewportToRevealHistoryChange";

const registries = createTestRegistries();

/** A 10x10 rect with its top-left corner at (x, y). */
const rect = (id: string, x: number, y: number) => ({
	id,
	type: "rect",
	x,
	y,
	width: 10,
	height: 10,
});

const docOf = (root: unknown[], background?: string): CanvasDoc =>
	({ version: 1, background, root }) as unknown as CanvasDoc;

/** Visible world rect (0, 0)-(800, 600) at zoom 1. */
const viewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 800,
	height: 600,
	zoom: 1,
};

/** The reveal for a swap from `leftDoc` to `restoredDoc`, seen from `from`. */
const reveal = (
	from: Viewport,
	leftDoc: CanvasDoc,
	restoredDoc: CanvasDoc,
): Viewport =>
	calcViewportToRevealHistoryChange(
		from,
		leftDoc,
		canvasToState(
			leftDoc,
			registries.objectMapper,
			registries.objectContentResizer,
		).objects,
		restoredDoc,
		canvasToState(
			restoredDoc,
			registries.objectMapper,
			registries.objectContentResizer,
		).objects,
		registries.objectVisualBounds,
	);

describe("calcViewportToRevealHistoryChange", () => {
	it("returns the same viewport when the change is already in view", () => {
		const leftDoc = docOf([rect("a", 100, 100)]);
		const restoredDoc = docOf([rect("a", 200, 100)]);

		expect(reveal(viewport, leftDoc, restoredDoc)).toBe(viewport);
	});

	it("returns the same viewport for the same doc", () => {
		const doc = docOf([rect("a", 5000, 5000)]);

		expect(reveal(viewport, doc, doc)).toBe(viewport);
	});

	it("pans the least that shows a modified object, with a 48px margin", () => {
		const leftDoc = docOf([rect("a", 100, 100)]);
		const restoredDoc = docOf([rect("a", 1000, 100)]);

		// The right edge at 1010 plus the margin lands on the visible right edge.
		expect(reveal(viewport, leftDoc, restoredDoc)).toEqual({
			...viewport,
			minX: 258,
		});
	});

	it("reveals an added object where the restored doc puts it", () => {
		const leftDoc = docOf([]);
		const restoredDoc = docOf([rect("a", 100, 2000)]);

		expect(reveal(viewport, leftDoc, restoredDoc)).toEqual({
			...viewport,
			minY: 1458,
		});
	});

	it("reveals a removed object where it was before the swap", () => {
		const leftDoc = docOf([rect("a", -500, 100)]);
		const restoredDoc = docOf([]);

		expect(reveal(viewport, leftDoc, restoredDoc)).toEqual({
			...viewport,
			minX: -548,
		});
	});

	it("reveals only the object that changed, not the ones merely carried over", () => {
		const leftDoc = docOf([rect("a", 100, 100), rect("b", 5000, 5000)]);
		const restoredDoc = docOf([rect("a", 100, 900), rect("b", 5000, 5000)]);

		expect(reveal(viewport, leftDoc, restoredDoc)).toEqual({
			...viewport,
			minY: 358,
		});
	});

	it("reveals a moved child of a group, not the whole group", () => {
		const groupOf = (childY: number) =>
			docOf([
				{
					id: "g",
					type: "group",
					children: [rect("a", 100, childY), rect("b", 5000, 5000)],
				},
			]);

		expect(reveal(viewport, groupOf(100), groupOf(900))).toEqual({
			...viewport,
			minY: 358,
		});
	});

	it("centres an axis the change does not fit on, and keeps the zoom", () => {
		const zoomed: Viewport = { ...viewport, zoom: 2 };
		// Two objects 2000 apart: wider than the 400 world units shown at zoom 2,
		// but only 10 tall, so y takes the smallest pan.
		const leftDoc = docOf([rect("a", 0, 1000), rect("b", 2000, 1000)]);
		const restoredDoc = docOf([rect("a", 0, 1001), rect("b", 2000, 1001)]);

		const revealed = reveal(zoomed, leftDoc, restoredDoc);

		// x: centre 1005 minus half of 400; y: bottom 1011 plus 24 minus 300.
		expect(revealed).toEqual({ ...zoomed, minX: 805, minY: 735 });
	});

	it("centres an oversized change even when the view already lies inside it", () => {
		const leftDoc = docOf([rect("a", -1000, 100), rect("b", 1000, 100)]);
		const restoredDoc = docOf([rect("a", -1000, 101), rect("b", 1000, 101)]);

		expect(reveal(viewport, leftDoc, restoredDoc)).toEqual({
			...viewport,
			minX: -395,
		});
	});

	it("does not move for a background or stacking-order change alone", () => {
		const leftDoc = docOf([rect("a", 5000, 0), rect("b", 6000, 0)]);
		const restacked = docOf([rect("b", 6000, 0), rect("a", 5000, 0)]);
		const recoloured = docOf(
			[rect("a", 5000, 0), rect("b", 6000, 0)],
			"#123456",
		);

		expect(reveal(viewport, leftDoc, restacked)).toBe(viewport);
		expect(reveal(viewport, leftDoc, recoloured)).toBe(viewport);
	});

	it("does not move a viewport that has not been measured yet", () => {
		const unmeasured: Viewport = { ...viewport, width: 0, height: 0 };
		const leftDoc = docOf([rect("a", 100, 100)]);
		const restoredDoc = docOf([rect("a", 5000, 100)]);

		expect(reveal(unmeasured, leftDoc, restoredDoc)).toBe(unmeasured);
	});
});

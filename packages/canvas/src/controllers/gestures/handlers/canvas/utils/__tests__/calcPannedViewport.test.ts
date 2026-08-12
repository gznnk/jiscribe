import { describe, it, expect } from "vitest";

import type { Viewport } from "../../../../../../states/canvas/Viewport";
import { calcPannedViewport } from "../calcPannedViewport";

const viewport = (overrides: Partial<Viewport> = {}): Viewport => ({
	minX: 100,
	minY: 200,
	width: 800,
	height: 600,
	zoom: 1,
	...overrides,
});

describe("calcPannedViewport", () => {
	it("moves the viewport against the drag, so the content follows the pointer", () => {
		expect(calcPannedViewport(viewport(), { x: 30, y: 40 })).toEqual(
			viewport({ minX: 70, minY: 160 }),
		);
	});

	it("keeps the viewport where it was for a zero delta", () => {
		expect(calcPannedViewport(viewport(), { x: 0, y: 0 })).toEqual(viewport());
	});

	it("converts the screen delta through the zoom, so a zoomed-in drag pans less world", () => {
		// 30 client px at zoom 2 is 15 world px.
		expect(calcPannedViewport(viewport({ zoom: 2 }), { x: 30, y: 40 })).toEqual(
			viewport({ zoom: 2, minX: 85, minY: 180 }),
		);
		// ...and at zoom 0.5 it is 60 world px.
		expect(
			calcPannedViewport(viewport({ zoom: 0.5 }), { x: 30, y: 40 }),
		).toEqual(viewport({ zoom: 0.5, minX: 40, minY: 120 }));
	});

	it("carries width, height and zoom over untouched", () => {
		const panned = calcPannedViewport(viewport({ zoom: 1.75 }), {
			x: -12,
			y: 7,
		});
		expect(panned.width).toBe(800);
		expect(panned.height).toBe(600);
		expect(panned.zoom).toBe(1.75);
	});

	it("rounds the origin to the coordinate precision", () => {
		// 1/3 world px per axis would otherwise carry a full float tail.
		const panned = calcPannedViewport(viewport({ zoom: 3 }), { x: 1, y: 1 });
		expect(panned.minX).toBe(99.6667);
		expect(panned.minY).toBe(199.6667);
	});

	it("depends only on the drag origin and the total delta", () => {
		// The handler re-derives the pan from the same start viewport every frame,
		// which only holds because the result is a pure function of the two: it
		// leaves nothing behind in the viewport it is given.
		const start = viewport();
		const half = calcPannedViewport(start, { x: 10, y: 10 });
		expect(calcPannedViewport(start, { x: 20, y: 20 })).toEqual(
			viewport({ minX: 80, minY: 180 }),
		);
		// Re-running the frame from the same origin repeats it exactly.
		expect(calcPannedViewport(start, { x: 10, y: 10 })).toEqual(half);
		expect(start).toEqual(viewport());
	});
});

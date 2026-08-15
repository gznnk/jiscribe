import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../states/canvas/Viewport";
import { clampScrolledCamera } from "../clampScrolledCamera";

/** 200 x 100 world units of view at zoom 1; zoom halves/doubles that. */
const viewport = (minX: number, minY: number, zoom = 1): Viewport => ({
	minX,
	minY,
	width: 200,
	height: 100,
	zoom,
});

/** Bounds wider and taller than the view above, so the range is not inverted. */
const bounds = { left: 0, top: 0, right: 500, bottom: 400 };

/** A scroll that started somewhere inside the bounds, which widens the range by nothing. */
const fromInside = { minX: 100, minY: 100, zoom: 1 };

describe("clampScrolledCamera", () => {
	it("returns the camera untouched when there are no bounds", () => {
		expect(
			clampScrolledCamera(viewport(-9999, 9999), fromInside, null),
		).toEqual({ minX: -9999, minY: 9999, zoom: 1 });
	});

	it("leaves a camera whose visible rect is inside the bounds alone", () => {
		expect(clampScrolledCamera(viewport(100, 100), fromInside, bounds)).toEqual(
			{ minX: 100, minY: 100, zoom: 1 },
		);
	});

	it("stops the visible rect at the near edge", () => {
		expect(clampScrolledCamera(viewport(-50, -30), fromInside, bounds)).toEqual(
			{ minX: 0, minY: 0, zoom: 1 },
		);
	});

	it("stops the visible rect at the far edge, which the view's own size sets", () => {
		// right - width/zoom = 500 - 200, bottom - height/zoom = 400 - 100
		expect(
			clampScrolledCamera(viewport(9999, 9999), fromInside, bounds),
		).toEqual({ minX: 300, minY: 300, zoom: 1 });
	});

	it("moves the far edge as the view grows on zoom out", () => {
		// At zoom 0.5 the view covers 400 x 200 world units.
		expect(
			clampScrolledCamera(viewport(9999, 9999, 0.5), fromInside, bounds),
		).toEqual({ minX: 100, minY: 200, zoom: 0.5 });
	});

	it("lets a content smaller than the view rest against either edge", () => {
		// 100-wide bounds in a 200-wide view: the range runs from "content flush
		// right" (-100) to "content flush left" (0), and anything between stays.
		const narrow = { left: 0, top: 0, right: 100, bottom: 400 };
		const fromNarrow = { minX: -50, minY: 0, zoom: 1 };

		expect(clampScrolledCamera(viewport(-40, 0), fromNarrow, narrow).minX).toBe(
			-40,
		);
		expect(clampScrolledCamera(viewport(50, 0), fromNarrow, narrow).minX).toBe(
			0,
		);
		expect(
			clampScrolledCamera(viewport(-500, 0), fromNarrow, narrow).minX,
		).toBe(-100);
	});

	it("rounds to the coordinate precision the viewport handlers round to", () => {
		const fractional = { left: 0.123456789, top: 0, right: 500, bottom: 400 };

		expect(
			clampScrolledCamera(viewport(-1, 0), fromInside, fractional).minX,
		).toBe(0.1235);
	});

	describe("scrolling from outside the bounds", () => {
		// The far edge is at 300, so a view sitting at 900 is 600 out.
		const fromOutside = { minX: 900, minY: 100, zoom: 1 };

		it("holds the view where it was rather than yanking it back", () => {
			expect(
				clampScrolledCamera(viewport(950, 100), fromOutside, bounds).minX,
			).toBe(900);
		});

		it("lets it scroll back toward the bounds", () => {
			expect(
				clampScrolledCamera(viewport(700, 100), fromOutside, bounds).minX,
			).toBe(700);
		});

		it("limits it normally again once it is back inside", () => {
			expect(
				clampScrolledCamera(viewport(-50, 100), fromOutside, bounds).minX,
			).toBe(0);
		});

		it("widens only the axis that is out", () => {
			// minX is out at 900, minY is inside at 100: Y keeps its own far edge.
			expect(
				clampScrolledCamera(viewport(950, 9999), fromOutside, bounds),
			).toEqual({ minX: 900, minY: 300, zoom: 1 });
		});
	});
});

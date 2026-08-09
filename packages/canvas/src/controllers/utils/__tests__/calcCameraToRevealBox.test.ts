import type { BoundingBox } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../states/canvas/Viewport";
import { calcCameraToRevealBox } from "../calcCameraToRevealBox";

/** Visible world rect (0, 0)-(400, 300) at zoom 1. */
const viewport: Viewport = {
	minX: 0,
	minY: 0,
	width: 400,
	height: 300,
	zoom: 1,
};

const box = (
	left: number,
	top: number,
	right: number,
	bottom: number,
): BoundingBox => ({ left, top, right, bottom });

describe("calcCameraToRevealBox", () => {
	it("returns null when the box already fits inside the visible rect", () => {
		expect(calcCameraToRevealBox(viewport, box(50, 50, 150, 120))).toBeNull();
	});

	it("returns null when the box touches the edges exactly", () => {
		expect(calcCameraToRevealBox(viewport, box(0, 0, 400, 300))).toBeNull();
	});

	it("pans left to reveal a box off the left edge", () => {
		expect(calcCameraToRevealBox(viewport, box(-30, 50, 70, 120))).toEqual({
			minX: -30,
			minY: 0,
			zoom: 1,
		});
	});

	it("pans up to reveal a box off the top edge", () => {
		expect(calcCameraToRevealBox(viewport, box(50, -40, 150, 60))).toEqual({
			minX: 0,
			minY: -40,
			zoom: 1,
		});
	});

	it("pans right to reveal a box off the right edge", () => {
		// The right edge at 460 has to land on the visible right edge: 460 - 400.
		expect(calcCameraToRevealBox(viewport, box(360, 50, 460, 120))).toEqual({
			minX: 60,
			minY: 0,
			zoom: 1,
		});
	});

	it("pans down to reveal a box off the bottom edge", () => {
		expect(calcCameraToRevealBox(viewport, box(50, 250, 150, 340))).toEqual({
			minX: 0,
			minY: 40,
			zoom: 1,
		});
	});

	it("pans on both axes at once", () => {
		expect(calcCameraToRevealBox(viewport, box(-30, 250, 70, 340))).toEqual({
			minX: -30,
			minY: 40,
			zoom: 1,
		});
	});

	it("shows the leading edge of a box longer than the visible rect", () => {
		// 600x500 box holding the whole visible rect: it cannot be shown whole, so
		// the pan lands on the edge it is reached from and the far end stays out.
		expect(calcCameraToRevealBox(viewport, box(-100, -100, 500, 400))).toEqual({
			minX: -100,
			minY: -100,
			zoom: 1,
		});
	});

	it("never changes the zoom", () => {
		// zoom 2 halves the visible world rect to 200x150.
		const zoomed: Viewport = { ...viewport, zoom: 2 };
		const camera = calcCameraToRevealBox(zoomed, box(150, 20, 250, 80));

		expect(camera).toEqual({ minX: 50, minY: 0, zoom: 2 });
	});

	it("reveals against the world rect scaled by the zoom", () => {
		// At zoom 0.5 the visible world rect is 800x600, so the same box fits.
		const zoomedOut: Viewport = { ...viewport, zoom: 0.5 };

		expect(calcCameraToRevealBox(zoomedOut, box(150, 20, 250, 80))).toBeNull();
	});

	it("converts the padding from screen px to world units", () => {
		// 20 screen px at zoom 2 is 10 world units, so a box ending exactly on the
		// visible right edge (200) still has to pan by that margin.
		const zoomed: Viewport = { ...viewport, zoom: 2 };

		expect(calcCameraToRevealBox(zoomed, box(100, 20, 200, 80), 20)).toEqual({
			minX: 10,
			minY: 0,
			zoom: 2,
		});
	});

	it("leaves the padding as empty margin around a revealed box", () => {
		expect(calcCameraToRevealBox(viewport, box(-30, 50, 70, 120), 24)).toEqual({
			minX: -54,
			minY: 0,
			zoom: 1,
		});
	});

	it("returns null when the padded box still fits", () => {
		expect(
			calcCameraToRevealBox(viewport, box(30, 30, 370, 270), 24),
		).toBeNull();
	});

	it("returns null for a viewport that has not been measured yet", () => {
		const unmeasured: Viewport = { ...viewport, width: 0, height: 0 };

		expect(calcCameraToRevealBox(unmeasured, box(-30, -30, 70, 70))).toBeNull();
	});
});

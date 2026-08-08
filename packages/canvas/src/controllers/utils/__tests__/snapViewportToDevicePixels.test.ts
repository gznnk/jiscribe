import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../states/canvas/Viewport";
import { snapViewportToDevicePixels } from "../snapViewportToDevicePixels";

const viewport = (overrides: Partial<Viewport> = {}): Viewport => ({
	minX: 0,
	minY: 0,
	width: 800,
	height: 600,
	zoom: 1,
	...overrides,
});

/** Device pixel the camera origin lands on; whole means the phase is frozen. */
const originInDevicePixels = (camera: Viewport, devicePixelRatio: number) =>
	camera.minX * camera.zoom * devicePixelRatio;

describe("snapViewportToDevicePixels", () => {
	it("leaves a camera already on the grid where it is", () => {
		const camera = viewport({ minX: 120, minY: -40 });
		expect(snapViewportToDevicePixels(camera, 1)).toEqual(camera);
	});

	it("rounds a sub-pixel pan onto the grid", () => {
		const snapped = snapViewportToDevicePixels(
			viewport({ minX: 120.4, minY: -40.6 }),
			1,
		);
		expect(snapped.minX).toBe(120);
		expect(snapped.minY).toBe(-41);
	});

	it("snaps to the device pixel, not the CSS pixel", () => {
		const snapped = snapViewportToDevicePixels(
			viewport({ minX: 120.4, minY: 0 }),
			2,
		);
		// Half a CSS pixel is a whole device pixel at this ratio.
		expect(snapped.minX).toBe(120.5);
	});

	it("takes the zoom into account, since it scales world units to pixels", () => {
		const snapped = snapViewportToDevicePixels(
			viewport({ minX: 10.44, zoom: 5 }),
			1,
		);
		expect(originInDevicePixels(snapped, 1)).toBe(52);
		expect(snapped.minX).toBeCloseTo(10.4, 10);
	});

	it("puts the origin on a whole device pixel at every ratio and zoom", () => {
		for (const zoom of [0.1, 0.75, 1, 1.1, 2.5, 10]) {
			for (const devicePixelRatio of [1, 1.25, 1.5, 2, 3]) {
				const snapped = snapViewportToDevicePixels(
					viewport({ minX: 137.317, minY: -84.913, zoom }),
					devicePixelRatio,
				);
				const scale = zoom * devicePixelRatio;
				expect(snapped.minX * scale).toBeCloseTo(
					Math.round(snapped.minX * scale),
					6,
				);
				expect(snapped.minY * scale).toBeCloseTo(
					Math.round(snapped.minY * scale),
					6,
				);
				// Never further than half a device pixel from where the camera was.
				expect(Math.abs(snapped.minX - 137.317) * scale).toBeLessThanOrEqual(
					0.5 + 1e-9,
				);
			}
		}
	});

	it("is idempotent, so re-snapping a drawn camera does not walk it", () => {
		const once = snapViewportToDevicePixels(
			viewport({ minX: 137.317, minY: -84.913, zoom: 1.1 }),
			1.5,
		);
		const twice = snapViewportToDevicePixels(once, 1.5);
		expect(twice.minX).toBeCloseTo(once.minX, 10);
		expect(twice.minY).toBeCloseTo(once.minY, 10);
	});

	it("passes the zoom and the measured size through untouched", () => {
		const snapped = snapViewportToDevicePixels(
			viewport({ minX: 0.3, zoom: 1.25 }),
			2,
		);
		expect(snapped.zoom).toBe(1.25);
		expect(snapped.width).toBe(800);
		expect(snapped.height).toBe(600);
	});

	it("leaves the camera alone when the ratio is unusable", () => {
		const camera = viewport({ minX: 120.4 });
		for (const ratio of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(snapViewportToDevicePixels(camera, ratio)).toBe(camera);
		}
	});
});

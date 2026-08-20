import { describe, expect, it } from "vitest";

import type { Viewport } from "../../../../../states/canvas/Viewport";
import { getWorldPoint } from "../getWorldPoint";

/**
 * Fake SVG element exposing only what getWorldPoint reads. jsdom has no layout,
 * so getBoundingClientRect is stubbed with the rect under test; getScreenCTM
 * returning null makes the getSvgPoint fallback degrade to client passthrough,
 * which the fallback tests rely on to tell the two paths apart.
 */
const fakeSvg = (rect: {
	left: number;
	top: number;
	width: number;
	height: number;
}): SVGSVGElement =>
	({
		getBoundingClientRect: () => rect as DOMRect,
		getScreenCTM: () => null,
		createSVGPoint: () => ({ x: 0, y: 0 }),
	}) as unknown as SVGSVGElement;

const viewport = (over: Partial<Viewport> = {}): Viewport => ({
	minX: 0,
	minY: 0,
	width: 800,
	height: 600,
	zoom: 1,
	...over,
});

describe("getWorldPoint", () => {
	it("maps a client point through pan and zoom of the state viewport", () => {
		const svg = fakeSvg({ left: 0, top: 40, width: 800, height: 600 });
		const vp = viewport({ minX: 100, minY: 50, zoom: 2 });

		// viewBox is 400x300 world units over an 800x600 rect: world = min + client-offset / 2.
		expect(getWorldPoint(svg, vp, 400, 340)).toEqual({ x: 300, y: 200 });
	});

	it("advances with a state viewport pan while the client point holds still", () => {
		const svg = fakeSvg({ left: 0, top: 0, width: 800, height: 600 });
		const vp = viewport();

		const before = getWorldPoint(svg, vp, 790, 300);
		vp.minX += 10;
		const after = getWorldPoint(svg, vp, 790, 300);

		expect(after.x - before.x).toBeCloseTo(10);
		expect(after.y).toBe(before.y);
	});

	it("stays exact when the host CSS-scales the canvas element", () => {
		// The element is drawn at half size: 800 viewport px render as a 400px rect.
		const svg = fakeSvg({ left: 0, top: 0, width: 400, height: 300 });
		const vp = viewport({ zoom: 2 });

		// 400 world units across a 400px rect: 1 world unit per client px.
		expect(getWorldPoint(svg, vp, 200, 150)).toEqual({ x: 200, y: 150 });
	});

	it("falls back to the CTM conversion without a viewport", () => {
		const svg = fakeSvg({ left: 0, top: 0, width: 800, height: 600 });

		// getScreenCTM is null on the fake, so the fallback passes client through.
		expect(getWorldPoint(svg, undefined, 123, 45)).toEqual({ x: 123, y: 45 });
	});

	it("falls back while the viewport is unmeasured (width/height 0)", () => {
		const svg = fakeSvg({ left: 0, top: 0, width: 800, height: 600 });

		expect(
			getWorldPoint(svg, viewport({ width: 0, height: 0 }), 123, 45),
		).toEqual({ x: 123, y: 45 });
	});

	it("falls back while the element has no layout (rect 0x0)", () => {
		const svg = fakeSvg({ left: 0, top: 0, width: 0, height: 0 });

		expect(getWorldPoint(svg, viewport(), 123, 45)).toEqual({ x: 123, y: 45 });
	});

	it("falls back to client passthrough without an SVG element", () => {
		expect(getWorldPoint(null, viewport(), 123, 45)).toEqual({ x: 123, y: 45 });
	});
});

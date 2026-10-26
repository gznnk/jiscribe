// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { GridPattern } from "../GridPattern";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

/** Renders the grid at `zoom`, replacing any grid rendered before, and returns its `<defs>`. */
const renderGrid = (zoom: number): SVGDefsElement => {
	unmount?.();
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() =>
		root.render(
			<svg>
				<GridPattern zoom={zoom} color="#cccccc" patternId="grid-1" />
			</svg>,
		),
	);
	unmount = () => act(() => root.unmount());
	return container.querySelector("defs")!;
};

/** The world-space spacing and line paint of one sub-pattern. */
const readLevel = (defs: SVGDefsElement, id: string) => {
	const pattern = defs.querySelector(`pattern[id="${id}"]`)!;
	const path = pattern.querySelector("path")!;
	return {
		size: Number(pattern.getAttribute("width")),
		opacity: Number(path.getAttribute("opacity")),
		strokeWidth: Number(path.getAttribute("stroke-width")),
	};
};

describe("GridPattern", () => {
	it("draws medium lines every 25 units and bold ones every 100 at zoom 1", () => {
		const defs = renderGrid(1);

		expect(readLevel(defs, "grid-1-medium").size).toBe(25);
		expect(readLevel(defs, "grid-1-bold").size).toBe(100);
	});

	it("coarsens the grid fourfold for every fourfold zoom out, and refines it zooming in", () => {
		expect(readLevel(renderGrid(0.25), "grid-1-medium").size).toBe(100);
		expect(readLevel(renderGrid(0.2), "grid-1-medium").size).toBe(400);
		expect(readLevel(renderGrid(4), "grid-1-medium").size).toBeCloseTo(6.25);
	});

	it("keeps the medium lines between 25 and 100 screen px at any zoom", () => {
		for (const zoom of [0.05, 0.2, 0.3, 1, 1.5, 3.9, 10]) {
			const screenSize =
				readLevel(renderGrid(zoom), "grid-1-medium").size * zoom;
			expect(screenSize).toBeGreaterThanOrEqual(25);
			expect(screenSize).toBeLessThan(100 + 1e-9);
		}
	});

	it("draws one screen px wide lines whatever the zoom", () => {
		const defs = renderGrid(2);

		expect(readLevel(defs, "grid-1-medium").strokeWidth).toBe(0.5);
		expect(readLevel(defs, "grid-1-bold").strokeWidth).toBe(0.5);
	});

	it("keeps the bold lines opaque and the medium ones fully drawn once 30 screen px apart", () => {
		const defs = renderGrid(1.2);

		expect(readLevel(defs, "grid-1-bold").opacity).toBe(1);
		expect(readLevel(defs, "grid-1-medium").opacity).toBe(1);
	});

	it("combines both levels into the pattern named by patternId, tiling at the bold spacing", () => {
		const defs = renderGrid(1);
		const combined = defs.querySelector('pattern[id="grid-1"]')!;

		expect(combined.getAttribute("width")).toBe("100");
		expect(
			[...combined.querySelectorAll("rect")].map((rect) =>
				rect.getAttribute("fill"),
			),
		).toEqual(["url(#grid-1-medium)", "url(#grid-1-bold)"]);
	});

	it("is left out of PNG / SVG exports", () => {
		expect(renderGrid(1).getAttribute("data-canvas-export")).toBe("exclude");
	});
});

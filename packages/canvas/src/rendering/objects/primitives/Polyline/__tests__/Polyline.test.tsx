// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { PolylineState } from "../../../../../states/objects/primitives/polyline/PolylineState";
import { ARROW_SIZE } from "../../../arrows/ArrowConstants";
import { Polyline } from "../Polyline";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

afterEach(() => {
	act(() => root?.unmount());
	root = null;
});

/** Renders a polyline from (0,0) to (100,0), its start head pointing along -x. */
const renderPolyline = (fields: Partial<PolylineState>): HTMLElement => {
	const state = {
		id: "line",
		type: "polyline",
		points: [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		],
		strokeWidth: 2,
		...fields,
	} as PolylineState;
	const container = document.createElement("div");
	root = createRoot(container);
	act(() =>
		root?.render(
			<svg>
				<Polyline {...state} />
			</svg>,
		),
	);
	return container;
};

describe("Polyline arrowheads", () => {
	it("scales the head by strokeWidth × arrowScale, outlined at the stroke width, and stops the line at its base", () => {
		const container = renderPolyline({
			startArrow: "HollowDiamond",
			arrowScale: 0.5,
		});

		const head = container.querySelector('polygon[data-kind="object"]');
		// Pointing along -x: the matrix's `a` term is -scale.
		expect(head?.getAttribute("transform")).toMatch(/^matrix\(-1, /);
		expect(head?.getAttribute("stroke-width")).toBe("2");
		const drawnLine = [...container.querySelectorAll("polyline")].find(
			(polyline) => !polyline.hasAttribute("data-kind"),
		);
		expect(drawnLine?.getAttribute("points")).toBe(`${ARROW_SIZE},0 100,0`);
	});

	it("thins the outline below arrowScale 0.5 and keeps it at the stroke width at 1", () => {
		// Thinned, the head is drawn as a group: the wedge and the V inside it.
		const thinHead = renderPolyline({
			endArrow: "OpenArrow",
			arrowScale: 0.3,
		}).querySelector('g[data-kind="object"] polyline');
		expect(thinHead?.getAttribute("stroke-width")).toBe("2");
		act(() => root?.unmount());

		const plainHead = renderPolyline({
			endArrow: "OpenArrow",
			arrowScale: 1,
		}).querySelector('polyline[data-kind="object"]:not([points^="0,0 100"])');
		expect(plainHead?.getAttribute("stroke-width")).toBe("1");
	});

	it("stops the line one stroke width short of an OpenArrow thinned below 0.5", () => {
		const container = renderPolyline({
			endArrow: "OpenArrow",
			arrowScale: 0.3,
		});
		const drawnLine = [...container.querySelectorAll("polyline")].find(
			(polyline) => !polyline.hasAttribute("data-kind"),
		);
		const lineEnd = Number(
			drawnLine?.getAttribute("points")?.split(" ")[1]?.split(",")[0],
		);
		expect(lineEnd).toBeCloseTo(100 - 2, 9);
	});

	it("stops the line short of a thinned OpenArrow at the start, and fills its wedge", () => {
		const container = renderPolyline({
			startArrow: "OpenArrow",
			arrowScale: 0.3,
		});
		const drawnLine = [...container.querySelectorAll("polyline")].find(
			(polyline) => !polyline.hasAttribute("data-kind"),
		);
		const lineStart = Number(
			drawnLine?.getAttribute("points")?.split(" ")[0]?.split(",")[0],
		);
		expect(lineStart).toBeCloseTo(2, 9);
		expect(
			container.querySelector('g[data-kind="object"] polygon'),
		).not.toBeNull();
	});
});

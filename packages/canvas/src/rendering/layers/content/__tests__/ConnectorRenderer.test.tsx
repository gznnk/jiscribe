// @vitest-environment jsdom

import type { ArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import { ARROW_SIZE } from "../../../objects/arrows/ArrowConstants";
import { ConnectorRenderer } from "../ConnectorRenderer";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

afterEach(() => {
	act(() => root?.unmount());
	root = null;
});

/** A free-ended connector from (0,0) to (100,0), its end head pointing along +x. */
const connectorWith = (
	fields: Partial<ConnectorState> & { endArrow: ArrowType },
): ConnectorState =>
	({
		id: "line",
		type: "connector",
		source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
		target: { anchor: { kind: "free", point: { x: 100, y: 0 } } },
		points: [],
		routing: "straight",
		strokeWidth: 2,
		...fields,
	}) as ConnectorState;

/** Renders the connector through ConnectorRenderer, the path the canvas draws it by. */
const renderConnector = (connectorState: ConnectorState): HTMLElement => {
	const container = document.createElement("div");
	root = createRoot(container);
	act(() =>
		root?.render(
			<svg>
				<ConnectorRenderer
					connectorState={connectorState}
					sourceObj={null}
					targetObj={null}
				/>
			</svg>,
		),
	);
	return container;
};

/** The `a` term of the head's `matrix(...)`: its scale, the head pointing along +x. */
const headScaleOf = (head: Element): number =>
	Number(/matrix\(([^,]+),/.exec(head.getAttribute("transform") ?? "")?.[1]);

/** The drawn line, as opposed to the hit area and the heads, which carry `data-kind`. */
const drawnLineOf = (container: HTMLElement): Element | undefined =>
	[...container.querySelectorAll("polyline")].find(
		(polyline) => !polyline.hasAttribute("data-kind"),
	);

describe("ConnectorRenderer arrowheads", () => {
	it("scales the head by strokeWidth × arrowScale and stops the line at its scaled base", () => {
		const container = renderConnector(
			connectorWith({ endArrow: "HollowTriangle", arrowScale: 3 }),
		);

		const head = container.querySelector('polygon[data-kind="connector"]');
		expect(head).not.toBeNull();
		expect(headScaleOf(head as Element)).toBe(6);
		expect(drawnLineOf(container)?.getAttribute("points")).toBe(
			`0,0 ${100 - ARROW_SIZE * 6},0`,
		);
	});

	it("keeps a hollow head's outline at the stroke width from arrowScale 0.5 up: 1 / arrowScale in its local units", () => {
		const container = renderConnector(
			connectorWith({ endArrow: "HollowTriangle", arrowScale: 4 }),
		);

		const head = container.querySelector('polygon[data-kind="connector"]');
		expect(head?.getAttribute("stroke-width")).toBe("0.25");
	});

	it("keeps every stroke of a line-drawn mark at the stroke width", () => {
		const container = renderConnector(
			connectorWith({ endArrow: "CrowFootZeroMany", arrowScale: 2 }),
		);

		const strokes = container.querySelectorAll(
			'g[data-kind="connector"] path, g[data-kind="connector"] circle',
		);
		expect(strokes).toHaveLength(2);
		for (const stroke of strokes) {
			expect(stroke.getAttribute("stroke-width")).toBe("0.5");
		}
	});

	it("thins the outline with a head scaled below 0.5: 1 / 0.5 in its local units", () => {
		const container = renderConnector(
			connectorWith({ endArrow: "HollowTriangle", arrowScale: 0.3 }),
		);

		const head = container.querySelector('polygon[data-kind="connector"]');
		expect(head?.getAttribute("stroke-width")).toBe("2");
		// The line still stops at the scaled base: 9 × 2 × 0.3 short of the tip.
		expect(drawnLineOf(container)?.getAttribute("points")).toBe(
			`0,0 ${100 - ARROW_SIZE * 2 * 0.3},0`,
		);
	});

	it("stops the line one stroke width short of an OpenArrow thinned below 0.5, and runs it to the tip at 1", () => {
		const thinned = renderConnector(
			connectorWith({ endArrow: "OpenArrow", arrowScale: 0.3 }),
		);
		const thinnedEnd = Number(
			drawnLineOf(thinned)
				?.getAttribute("points")
				?.split(" ")[1]
				?.split(",")[0],
		);
		expect(thinnedEnd).toBeCloseTo(100 - 2, 9);
		act(() => root?.unmount());

		const plain = renderConnector(
			connectorWith({ endArrow: "OpenArrow", arrowScale: 1 }),
		);
		expect(drawnLineOf(plain)?.getAttribute("points")).toBe("0,0 100,0");
	});

	it("fills the wedge from the line's end to a thinned OpenArrow's tip in the line's color, and none at 1", () => {
		const thinned = renderConnector(
			connectorWith({
				endArrow: "OpenArrow",
				arrowScale: 0.3,
				stroke: "#123456",
			}),
		);
		const wedge = thinned.querySelector('g[data-kind="connector"] polygon');
		// Local units: one stroke width back (1 / 0.3), half a stroke width wide (0.5 / 0.3).
		const corners = (wedge?.getAttribute("points") ?? "")
			.split(" ")
			.map((corner) => corner.split(",").map(Number));
		expect(corners[0]).toEqual([0, 0]);
		expect(corners[1][0]).toBeCloseTo(-1 / 0.3, 9);
		expect(corners[1][1]).toBeCloseTo(-0.5 / 0.3, 9);
		expect(corners[4][0]).toBeCloseTo(-1 / 0.3, 9);
		expect(corners[4][1]).toBeCloseTo(0.5 / 0.3, 9);
		expect(getComputedStyle(wedge as Element).fill).toBe("rgb(18, 52, 86)");
		act(() => root?.unmount());

		const plain = renderConnector(
			connectorWith({ endArrow: "OpenArrow", arrowScale: 1 }),
		);
		expect(plain.querySelector('[data-kind="connector"] polygon')).toBeNull();
		expect(plain.querySelector('polygon[data-kind="connector"]')).toBeNull();
	});

	it("stops the line short of a thinned OpenArrow at the start, and fills its wedge", () => {
		const container = renderConnector(
			connectorWith({
				startArrow: "OpenArrow",
				endArrow: "None",
				arrowScale: 0.3,
			}),
		);

		const lineStart = Number(
			drawnLineOf(container)
				?.getAttribute("points")
				?.split(" ")[0]
				?.split(",")[0],
		);
		expect(lineStart).toBeCloseTo(2, 9);
		expect(
			container.querySelector('g[data-kind="connector"] polygon'),
		).not.toBeNull();
	});

	it("draws an unset arrowScale at 1: the head as large as the stroke width alone makes it", () => {
		const container = renderConnector(
			connectorWith({ endArrow: "HollowTriangle" }),
		);

		const head = container.querySelector('polygon[data-kind="connector"]');
		expect(headScaleOf(head as Element)).toBe(2);
		expect(head?.getAttribute("stroke-width")).toBe("1");
	});
});

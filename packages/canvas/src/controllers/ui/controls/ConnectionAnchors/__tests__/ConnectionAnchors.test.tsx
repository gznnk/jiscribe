// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import type { AnchorFrame } from "../../../../../rendering/objects/connector/geometry/calcConnectPoint";
import type { ConnectionAnchors as ResolvedConnectionAnchors } from "../../../../../rendering/objects/registry/ObjectConnectionAnchorsRegistry";
import type { ExtraConnectPoint } from "../../../../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import { ConnectionAnchors } from "../ConnectionAnchors";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** An unrotated, unscaled frame (center 100,100 / width 40 / height 20). */
const frame = {
	cx: 100,
	cy: 100,
	width: 40,
	height: 20,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
} as AnchorFrame;

const tip: ExtraConnectPoint = {
	id: "tip",
	point: { x: 10, y: 10 },
	direction: { x: 0, y: 1 },
};

/** Renders the source dots and returns the `data-action` of each, in order. */
const renderAnchorActions = (
	connectionAnchors: ResolvedConnectionAnchors | null,
): string[] => {
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() =>
		root.render(
			<svg>
				<ConnectionAnchors
					objectId="r1"
					frame={frame}
					extraConnectPoints={[tip]}
					connectionAnchors={connectionAnchors}
				/>
			</svg>,
		),
	);
	const anchorActions = Array.from(container.querySelectorAll("circle")).map(
		(circle) => circle.getAttribute("data-action") ?? "",
	);
	act(() => root.unmount());
	return anchorActions;
};

describe("ConnectionAnchors", () => {
	it("offers the four edge anchors and the declared ones when nothing is hidden", () => {
		expect(renderAnchorActions(null)).toEqual([
			"anchor:topCenter",
			"anchor:rightCenter",
			"anchor:bottomCenter",
			"anchor:leftCenter",
			"anchor:tip",
		]);
	});

	it("draws no dot for a hidden edge or extra anchor", () => {
		expect(
			renderAnchorActions({
				topCenter: { hidden: true },
				bottomCenter: { hidden: true },
				tip: { hidden: true },
			}),
		).toEqual(["anchor:rightCenter", "anchor:leftCenter"]);
	});

	it("keeps a dot whose entry only moves it", () => {
		expect(renderAnchorActions({ topCenter: { offset: 40 } })).toContain(
			"anchor:topCenter",
		);
	});
});

// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import type { AnchorFrame } from "../../../../../connectors/calcConnectPoint";
import type { ConnectionAnchors as ResolvedConnectionAnchors } from "../../../../../rendering/objects/registry/ObjectConnectionAnchorsRegistry";
import type { ExtraConnectPoint } from "../../../../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import { ConnectionTargetAnchors } from "../ConnectionTargetAnchors";

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

// Local (10, 10) is world (110, 110), off every built-in dot.
const tip: ExtraConnectPoint = {
	id: "tip",
	point: { x: 10, y: 10 },
	direction: { x: 0, y: 1 },
};

/** Renders the landing dots and returns their centers as "x,y", in order. */
const renderDotCenters = (
	connectionAnchors: ResolvedConnectionAnchors | null,
): string[] => {
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() =>
		root.render(
			<svg>
				<ConnectionTargetAnchors
					frame={frame}
					extraConnectPoints={[tip]}
					connectionAnchors={connectionAnchors}
					activeAnchorId={null}
				/>
			</svg>,
		),
	);
	const dotCenters = Array.from(container.querySelectorAll("circle")).map(
		(circle) => `${circle.getAttribute("cx")},${circle.getAttribute("cy")}`,
	);
	act(() => root.unmount());
	return dotCenters;
};

describe("ConnectionTargetAnchors", () => {
	it("draws the center, the four edge anchors and the declared ones when nothing is hidden", () => {
		expect(renderDotCenters(null)).toEqual([
			"100,100",
			"100,90",
			"120,100",
			"100,110",
			"80,100",
			"110,110",
		]);
	});

	it("draws no landing dot for a hidden edge or extra anchor, keeping the center", () => {
		expect(
			renderDotCenters({
				topCenter: { hidden: true },
				leftCenter: { hidden: true },
				tip: { hidden: true },
			}),
		).toEqual(["100,100", "120,100", "100,110"]);
	});
});

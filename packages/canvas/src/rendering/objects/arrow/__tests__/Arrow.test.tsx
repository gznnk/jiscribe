// @vitest-environment jsdom

import { ArrowTypes } from "@jiscribe/doc/model/objects/types/ArrowType";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { Arrow } from "../Arrow";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** The `stroke-width` of every element the head draws, in document order. */
const renderStrokeWidths = (
	type: (typeof ArrowTypes)[number],
	outlineWidth?: number,
): (string | null)[] => {
	const container = document.createElement("div");
	const root = createRoot(container);
	act(() =>
		root.render(
			<svg>
				<Arrow
					type={type}
					x={0}
					y={0}
					color="#000"
					radians={0}
					scale={2}
					outlineWidth={outlineWidth}
				/>
			</svg>,
		),
	);
	const widths = [...container.querySelectorAll("svg *")]
		.filter((element) => element.tagName !== "g")
		.map((element) => element.getAttribute("stroke-width"));
	act(() => root.unmount());
	return widths;
};

describe("Arrow outlineWidth", () => {
	it("draws every stroke of every line-drawn head at outlineWidth", () => {
		for (const type of ArrowTypes) {
			for (const width of renderStrokeWidths(type, 0.25)) {
				// A filled head states no stroke width at all.
				expect([null, "0.25"], type).toContain(width);
			}
		}
	});

	it("reaches the strokes of the hollow, open, cross and crow's foot heads", () => {
		for (const type of [
			"HollowTriangle",
			"HollowDiamond",
			"HollowCircle",
			"OpenArrow",
			"Cross",
			"CrowFootMany",
			"CrowFootOneMany",
			"CrowFootZeroMany",
			"CrowFootOne",
			"CrowFootZeroOne",
		] as const) {
			expect(renderStrokeWidths(type, 0.25), type).toContain("0.25");
		}
	});

	it("draws the outline 1 local unit wide when omitted", () => {
		expect(renderStrokeWidths("HollowTriangle")).toEqual(["1"]);
	});
});

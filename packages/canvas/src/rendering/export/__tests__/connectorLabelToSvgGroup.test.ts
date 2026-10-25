// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { connectorLabelToSvgGroup } from "../foreignObjectToSvgText";

const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/** jsdom has no 2D context; nothing here asserts on the measured widths. */
const measureContext = {
	measureText: () => ({ width: 0 }),
} as unknown as CanvasRenderingContext2D;

/** A connector label's foreignObject whose LabelBox carries `boxStyle` inline. */
const mountLabel = (boxStyle: string): Element => {
	const svg = document.createElementNS(SVG_NS, "svg");
	const foreignObject = document.createElementNS(SVG_NS, "foreignObject");
	foreignObject.setAttribute("width", "80");
	foreignObject.setAttribute("height", "24");
	const labelBox = document.createElementNS(XHTML_NS, "div");
	labelBox.setAttribute("style", boxStyle);
	labelBox.textContent = "label";
	foreignObject.append(labelBox);
	svg.append(foreignObject);
	document.body.append(svg);
	return foreignObject;
};

const boxRectOf = (boxStyle: string): Element | null => {
	const foreignObject = mountLabel(boxStyle);
	const group = connectorLabelToSvgGroup(
		foreignObject,
		foreignObject.cloneNode(true) as Element,
		measureContext,
	);
	return group?.querySelector("rect") ?? null;
};

afterEach(() => {
	document.body.innerHTML = "";
});

describe("connectorLabelToSvgGroup box rect", () => {
	// The last channel of an opaque rgb() is blue, not alpha.
	it("fills the box with an opaque background whose blue is 0", () => {
		const rect = boxRectOf("background-color: rgb(255, 255, 0)");
		expect(rect?.getAttribute("fill")).toBe("rgb(255, 255, 0)");
	});

	it("strokes the box with an opaque border whose blue is 0", () => {
		const rect = boxRectOf("border: 2px solid rgb(255, 255, 0)");
		expect(rect?.getAttribute("stroke")).toBe("rgb(255, 255, 0)");
	});

	it("draws no box for a background and border with zero alpha", () => {
		expect(
			boxRectOf(
				"background-color: rgba(255, 255, 0, 0); border: 2px solid rgba(255, 255, 0, 0)",
			),
		).toBeNull();
	});
});

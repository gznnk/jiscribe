// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildExportSvg } from "../buildExportSvg";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * A live canvas SVG holding one content group with one shape in it. The hiding
 * is a class rule, the way ContentGroup's emotion class does it — an inline
 * style would be copied by cloneNode and prove nothing about the export.
 */
const mountCanvasSvg = (isContentHidden: boolean): SVGSVGElement => {
	const style = document.createElement("style");
	style.textContent = ".content-hidden { visibility: hidden; }";
	document.head.append(style);
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("width", "400");
	svg.setAttribute("height", "300");
	svg.setAttribute("viewBox", "0 0 400 300");
	const contentGroup = document.createElementNS(SVG_NS, "g");
	if (isContentHidden) {
		contentGroup.setAttribute("class", "content-hidden");
	}
	const rect = document.createElementNS(SVG_NS, "rect");
	rect.setAttribute("width", "100");
	rect.setAttribute("height", "50");
	contentGroup.append(rect);
	svg.append(contentGroup);
	document.body.append(svg);
	return svg;
};

/**
 * jsdom has no 2D context, which buildExportSvg acquires up front to measure the
 * text it converts; nothing here holds any, so a bare stand-in is enough.
 */
const stubMeasureContext = (): void => {
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
		measureText: () => ({ width: 0 }),
	} as unknown as CanvasRenderingContext2D);
};

afterEach(() => {
	document.head.innerHTML = "";
	document.body.innerHTML = "";
	vi.restoreAllMocks();
});

describe("buildExportSvg while the font gate hides the scene", () => {
	it("draws the content, so an export taken before the faces land is not blank", () => {
		stubMeasureContext();
		const liveSvg = mountCanvasSvg(true);
		expect(getComputedStyle(liveSvg.querySelector("g")!).visibility).toBe(
			"hidden",
		);

		const exported = buildExportSvg(liveSvg);

		const contentGroup = exported.querySelector("g");
		expect(contentGroup?.hasAttribute("class")).toBe(false);
		expect(contentGroup?.style.visibility).toBe("");
		expect(contentGroup?.querySelector("rect")).not.toBeNull();
	});
});

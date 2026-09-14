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

/** A live canvas SVG holding one image object, drawn from a blob URL. */
const mountCanvasSvgWithImage = (src: string): SVGSVGElement => {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", "0 0 400 300");
	const image = document.createElementNS(SVG_NS, "image");
	image.setAttribute("href", "blob:stub/0");
	image.setAttribute("data-image-src", src);
	image.setAttribute("width", "200");
	image.setAttribute("height", "120");
	svg.append(image);
	document.body.append(svg);
	return svg;
};

describe("buildExportSvg and the image files", () => {
	it("carries the bytes of a resolved image instead of its blob URL", () => {
		stubMeasureContext();
		const liveSvg = mountCanvasSvgWithImage("images/logo.png");

		const exported = buildExportSvg(liveSvg, {
			resolveImageHref: (src) =>
				src === "images/logo.png" ? "data:image/png;base64,AAA=" : undefined,
		});

		const image = exported.querySelector("image");
		expect(image?.getAttribute("href")).toBe("data:image/png;base64,AAA=");
		// The marker is the live DOM's own; an exported file has no use for it.
		expect(image?.hasAttribute("data-image-src")).toBe(false);
	});

	it("drops an image whose file the lookup does not know", () => {
		stubMeasureContext();
		const liveSvg = mountCanvasSvgWithImage("images/logo.png");

		const exported = buildExportSvg(liveSvg, {
			resolveImageHref: () => undefined,
		});

		expect(exported.querySelector("image")).toBeNull();
	});

	it("drops every image when no lookup is passed at all", () => {
		stubMeasureContext();
		const liveSvg = mountCanvasSvgWithImage("images/logo.png");

		const exported = buildExportSvg(liveSvg);

		expect(exported.querySelector("image")).toBeNull();
		expect(exported.outerHTML).not.toContain("blob:");
	});
});

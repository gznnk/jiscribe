// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { shouldBakeDeclaration } from "../bakeHtmlOverlayStyles";
import {
	buildExportSvg,
	buildExportSvgWithHtmlOverlays,
	replaceKeptHtmlOverlaysWithText,
} from "../buildExportSvg";

const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/** Where the flatten group places the overlay, as createFrameObject writes it. */
const GROUP_TRANSFORM = "matrix(1, 0, 0, 1, 120, 80)";

/**
 * A live canvas SVG holding one text overlay in the TextOverlayFrame shape
 * (`foreignObject > wrapper > content`) inside a flatten group, its content a
 * table styled by a class rule — a class an inline-style copy would not carry.
 */
const mountOverlaySvg = (
	isMarkedHtml: boolean,
): { svg: SVGSVGElement; liveForeignObject: Element } => {
	const style = document.createElement("style");
	style.textContent = ".md-table { color: rgb(0, 128, 0); }";
	document.head.append(style);

	const svg = document.createElementNS(SVG_NS, "svg");
	svg.setAttribute("viewBox", "0 0 400 300");
	const group = document.createElementNS(SVG_NS, "g");
	group.setAttribute("transform", GROUP_TRANSFORM);
	group.setAttribute("data-canvas-export", "flatten");
	const foreignObject = document.createElementNS(SVG_NS, "foreignObject");
	foreignObject.setAttribute("width", "200");
	foreignObject.setAttribute("height", "100");
	foreignObject.setAttribute("transform", "translate(-100 -50)");
	foreignObject.setAttribute("class", "overlay");
	if (isMarkedHtml) {
		foreignObject.setAttribute("data-canvas-export", "html");
	}
	const wrapper = document.createElementNS(XHTML_NS, "div");
	const content = document.createElementNS(XHTML_NS, "div");
	const table = document.createElementNS(XHTML_NS, "table");
	table.setAttribute("class", "md-table");
	table.textContent = "cell";
	content.append(table);
	wrapper.append(content);
	foreignObject.append(wrapper);
	group.append(foreignObject);
	svg.append(group);
	document.body.append(svg);
	return { svg, liveForeignObject: foreignObject };
};

/** jsdom has no 2D context; nothing here asserts on the measured widths. */
const stubMeasureContext = (): void => {
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
		measureText: () => ({ width: 0 }),
	} as unknown as CanvasRenderingContext2D);
};

/** A computed style listing exactly `values`, the way a browser enumerates its longhands. */
const fakeComputedStyle = (
	values: Record<string, string>,
): CSSStyleDeclaration => {
	const names = Object.keys(values);
	return Object.assign([...names], {
		getPropertyValue: (name: string) => values[name] ?? "",
	}) as unknown as CSSStyleDeclaration;
};

/** The Typed OM jsdom lacks, as the one method the export reads. */
type TypedOmElement = {
	computedStyleMap?: () => {
		get: (name: string) => { toString(): string } | undefined;
	};
};

/**
 * Stands in for how a browser reads the size of the overlay's divs: every div
 * reports a used `height` through `getComputedStyle` (43px for `content`, 0px
 * for the others, the bare default probe included), and the Typed OM reports
 * the computed one — `contentTypedHeight` for `content`, `auto` for the rest.
 * A null `contentTypedHeight` leaves the Typed OM out, as Firefox does.
 */
const stubDivHeights = (
	content: Element,
	contentTypedHeight: string | null,
): void => {
	const readComputedStyle = window.getComputedStyle.bind(window);
	vi.spyOn(window, "getComputedStyle").mockImplementation((element) =>
		element instanceof HTMLDivElement
			? fakeComputedStyle({ height: element === content ? "43px" : "0px" })
			: readComputedStyle(element),
	);
	if (contentTypedHeight === null) {
		return;
	}
	(HTMLDivElement.prototype as TypedOmElement).computedStyleMap = function (
		this: Element,
	) {
		const height = this === content ? contentTypedHeight : "auto";
		return {
			get: (name: string) =>
				name === "height" ? { toString: () => height } : undefined,
		};
	};
};

afterEach(() => {
	document.head.innerHTML = "";
	document.body.innerHTML = "";
	vi.restoreAllMocks();
	delete (HTMLDivElement.prototype as TypedOmElement).computedStyleMap;
});

describe("shouldBakeDeclaration", () => {
	it("leaves out a value equal to both the UA default and the parent's", () => {
		expect(shouldBakeDeclaration("none", "none", "none")).toBe(false);
	});

	it("writes a value that differs from the UA default", () => {
		expect(shouldBakeDeclaration("12px", "16px", "12px")).toBe(true);
	});

	it("writes a value equal to the default when the parent's differs", () => {
		// `.katex svg { stroke: currentColor }` over `path { stroke: none }`: the
		// path would otherwise inherit the svg's stroke.
		expect(shouldBakeDeclaration("none", "none", "rgb(0, 0, 0)")).toBe(true);
	});

	it("compares the subtree root against the default alone", () => {
		expect(shouldBakeDeclaration("none", "none", null)).toBe(false);
		expect(shouldBakeDeclaration("block", "inline", null)).toBe(true);
	});

	it("writes a value the parent's style does not list", () => {
		expect(shouldBakeDeclaration("none", "none", undefined)).toBe(true);
	});
});

describe("buildExportSvgWithHtmlOverlays keeping HTML overlays", () => {
	it("keeps a marked foreignObject, its classes dropped and their declarations inline", () => {
		stubMeasureContext();
		const { svg } = mountOverlaySvg(true);

		const exported = buildExportSvgWithHtmlOverlays(svg, {}, "keep").exportSvg;

		const foreignObject = exported.querySelector("foreignObject");
		expect(foreignObject).not.toBeNull();
		expect(exported.querySelector("text")).toBeNull();
		const table = foreignObject!.querySelector("table") as HTMLElement;
		expect(table.hasAttribute("class")).toBe(false);
		expect(foreignObject!.hasAttribute("class")).toBe(false);
		expect(table.style.color).toBe("rgb(0, 128, 0)");
	});

	it("leaves the root's transform to the attribute the flatten step rewrites", () => {
		stubMeasureContext();
		const { svg, liveForeignObject } = mountOverlaySvg(true);
		// Chromium reports the transform attribute as a computed transform; jsdom
		// does not, so the root's style is stood in for.
		const readComputedStyle = window.getComputedStyle.bind(window);
		vi.spyOn(window, "getComputedStyle").mockImplementation((element) =>
			element === liveForeignObject
				? fakeComputedStyle({
						transform: "matrix(1, 0, 0, 1, 20, 30)",
						width: "200px",
						opacity: "0.5",
					})
				: readComputedStyle(element),
		);

		const exported = buildExportSvgWithHtmlOverlays(svg, {}, "keep").exportSvg;

		const foreignObject = exported.querySelector("foreignObject") as SVGElement;
		expect(foreignObject.style.getPropertyValue("transform")).toBe("");
		expect(foreignObject.style.getPropertyValue("width")).toBe("");
		// The root's other longhands are still baked.
		expect(foreignObject.style.getPropertyValue("opacity")).toBe("0.5");
		expect(foreignObject.getAttribute("transform")).toBe(
			`${GROUP_TRANSFORM} translate(-100 -50)`,
		);
	});

	it("removes the hidden host the UA defaults are read in", () => {
		stubMeasureContext();
		const { svg } = mountOverlaySvg(true);
		const bodyChildCount = document.body.childElementCount;

		buildExportSvgWithHtmlOverlays(svg, {}, "keep");

		expect(document.body.childElementCount).toBe(bodyChildCount);
	});

	it("reads the UA defaults in one host for every overlay of the export", () => {
		stubMeasureContext();
		const { svg } = mountOverlaySvg(true);
		svg.append(svg.firstElementChild!.cloneNode(true));
		const attachShadow = vi.spyOn(Element.prototype, "attachShadow");

		const { keptHtmlOverlays } = buildExportSvgWithHtmlOverlays(
			svg,
			{},
			"keep",
		);

		expect(keptHtmlOverlays).toHaveLength(2);
		expect(attachShadow).toHaveBeenCalledTimes(1);
	});

	it("drops an inline var() the clone copied when its value is left out", () => {
		stubMeasureContext();
		const { liveForeignObject, svg } = mountOverlaySvg(true);
		const wrapper = liveForeignObject.firstElementChild as HTMLElement;
		wrapper.style.setProperty("--x", "rgb(1, 2, 3)");
		const content = wrapper.firstElementChild as HTMLElement;
		content.setAttribute("style", "color: var(--x)");
		// jsdom resolves no var(); a browser reports the value the parent has, which
		// the rule then leaves out, so nothing of the copied declaration is rewritten.
		const readComputedStyle = window.getComputedStyle.bind(window);
		vi.spyOn(window, "getComputedStyle").mockImplementation((element) =>
			readComputedStyle(element === content ? wrapper : element),
		);

		const exported = buildExportSvgWithHtmlOverlays(svg, {}, "keep").exportSvg;

		const clonedContent = exported.querySelector("foreignObject")!
			.firstElementChild!.firstElementChild as HTMLElement;
		expect(clonedContent.getAttribute("style") ?? "").not.toContain("var(");
	});

	it("swaps a kept overlay for <text> under the transform the flatten step wrote", () => {
		stubMeasureContext();
		const { svg } = mountOverlaySvg(true);

		const { exportSvg, keptHtmlOverlays } = buildExportSvgWithHtmlOverlays(
			svg,
			{},
			"keep",
		);
		replaceKeptHtmlOverlaysWithText(keptHtmlOverlays);

		expect(exportSvg.querySelector("foreignObject")).toBeNull();
		const text = exportSvg.querySelector("text");
		expect(text?.textContent).toBe("cell");
		expect(text?.parentElement?.getAttribute("transform")).toBe(
			`${GROUP_TRANSFORM} translate(-100 -50)`,
		);
	});

	it("leaves out a height the Typed OM reports as auto, used px aside", () => {
		stubMeasureContext();
		const { liveForeignObject, svg } = mountOverlaySvg(true);
		stubDivHeights(
			liveForeignObject.firstElementChild!.firstElementChild!,
			"auto",
		);

		const exported = buildExportSvgWithHtmlOverlays(svg, {}, "keep").exportSvg;

		const clonedContent = exported.querySelector("foreignObject")!
			.firstElementChild!.firstElementChild as HTMLElement;
		expect(clonedContent.style.getPropertyValue("height")).toBe("");
	});

	it("writes a height the Typed OM reports as set", () => {
		stubMeasureContext();
		const { liveForeignObject, svg } = mountOverlaySvg(true);
		stubDivHeights(
			liveForeignObject.firstElementChild!.firstElementChild!,
			"43px",
		);

		const exported = buildExportSvgWithHtmlOverlays(svg, {}, "keep").exportSvg;

		const clonedContent = exported.querySelector("foreignObject")!
			.firstElementChild!.firstElementChild as HTMLElement;
		expect(clonedContent.style.getPropertyValue("height")).toBe("43px");
	});

	it("writes the used height where there is no Typed OM", () => {
		stubMeasureContext();
		const { liveForeignObject, svg } = mountOverlaySvg(true);
		stubDivHeights(
			liveForeignObject.firstElementChild!.firstElementChild!,
			null,
		);

		const exported = buildExportSvgWithHtmlOverlays(svg, {}, "keep").exportSvg;

		const clonedContent = exported.querySelector("foreignObject")!
			.firstElementChild!.firstElementChild as HTMLElement;
		expect(clonedContent.style.getPropertyValue("height")).toBe("43px");
	});

	it("still converts an unmarked foreignObject to <text>", () => {
		stubMeasureContext();
		const { svg } = mountOverlaySvg(false);

		const exported = buildExportSvgWithHtmlOverlays(svg, {}, "keep").exportSvg;

		expect(exported.querySelector("foreignObject")).toBeNull();
		expect(exported.querySelector("text")?.textContent).toBe("cell");
	});
});

describe("buildExportSvg over a marked HTML overlay", () => {
	it("flattens it to <text>, as the SVG file is written", () => {
		stubMeasureContext();
		const { svg } = mountOverlaySvg(true);

		const exported = buildExportSvg(svg);

		expect(exported.querySelector("foreignObject")).toBeNull();
		expect(exported.querySelector("text")?.textContent).toBe("cell");
	});
});

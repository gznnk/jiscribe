// @vitest-environment jsdom

import {
	extractCanvasSourceFromSvgText,
	SVG_SOURCE_LOCAL_NAME,
	SVG_SOURCE_NS,
} from "@jiscribe/doc/file/svgSourceText";
import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import {
	embedCanvasSource,
	extractCanvasSource,
} from "../canvasSourceMetadata";

const SVG_NS = "http://www.w3.org/2000/svg";

const createSvgWithText = (): SVGSVGElement => {
	const svg = document.createElementNS(SVG_NS, "svg");
	svg.appendChild(document.createElementNS(SVG_NS, "text"));
	return svg;
};

// Text a label could hold that XML has to escape.
const doc = {
	version: 1,
	root: [
		{
			id: "rect-1",
			type: "rect",
			text: { body: { text: 'a < b && c > "d"' } },
		},
	],
} as unknown as CanvasDoc;

describe("embedCanvasSource / extractCanvasSource", () => {
	it("reads back the document it embedded", () => {
		const svg = createSvgWithText();
		embedCanvasSource(svg, doc);

		expect(extractCanvasSource(svg)).toEqual(doc);
	});

	it("puts the source in a <metadata> ahead of the visuals", () => {
		const svg = createSvgWithText();
		embedCanvasSource(svg, doc);

		const metadata = svg.firstElementChild;
		expect(metadata?.localName).toBe("metadata");
		expect(metadata?.namespaceURI).toBe(SVG_NS);
		const source = metadata?.firstElementChild;
		expect(source?.namespaceURI).toBe(SVG_SOURCE_NS);
		expect(source?.localName).toBe(SVG_SOURCE_LOCAL_NAME);
		expect(svg.lastElementChild?.localName).toBe("text");
	});

	it("stamps the document's version, 1 when it states none", () => {
		const svg = createSvgWithText();
		embedCanvasSource(svg, {
			...doc,
			version: undefined,
		} as unknown as CanvasDoc);

		const source = svg.getElementsByTagNameNS(
			SVG_SOURCE_NS,
			SVG_SOURCE_LOCAL_NAME,
		)[0];
		expect(source.getAttribute("data-jiscribe-version")).toBe("1");
	});

	it("serializes to text the headless reader recovers the same JSON from", () => {
		const svg = createSvgWithText();
		embedCanvasSource(svg, doc);
		const svgText = new XMLSerializer().serializeToString(svg);

		const sourceJson = extractCanvasSourceFromSvgText(svgText);
		expect(sourceJson).not.toBeNull();
		expect(JSON.parse(sourceJson!)).toEqual(doc);
	});

	it("answers null for an SVG holding no source", () => {
		expect(extractCanvasSource(createSvgWithText())).toBeNull();
	});

	it("answers null for an empty or unparsable source", () => {
		for (const content of ["", "{not json"]) {
			const svg = createSvgWithText();
			const source = document.createElementNS(
				SVG_SOURCE_NS,
				`jiscribe:${SVG_SOURCE_LOCAL_NAME}`,
			);
			source.textContent = content;
			svg.appendChild(source);

			expect(extractCanvasSource(svg)).toBeNull();
		}
	});
});

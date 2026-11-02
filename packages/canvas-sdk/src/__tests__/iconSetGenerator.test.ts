import { describe, expect, it } from "vitest";

import {
	convertIconSetSvg,
	formatIconSetCatalogModule,
	formatIconSetDrawingsModule,
} from "../../icon-set-generator/index.mjs";

const convert = (source: string) =>
	convertIconSetSvg(source, { filePath: "test.svg", idPrefix: "set-icon" });

const svg = (body: string, rootAttrs = 'viewBox="0 0 18 18"'): string =>
	`<svg xmlns="http://www.w3.org/2000/svg" ${rootAttrs}>${body}</svg>`;

describe("convertIconSetSvg: the lists", () => {
	it("fails on an element that is not on the list", () => {
		expect(() => convert(svg("<text>x</text>"))).toThrow(/test\.svg: .*<text>/);
		expect(() => convert(svg('<image href="a.png" />'))).toThrow(/<image>/);
	});

	it("fails on an attribute or a style declaration that is not on the list", () => {
		expect(() => convert(svg('<path d="M0 0" filter="url(#f)" />'))).toThrow(
			/filter/,
		);
		expect(() =>
			convert(svg('<path d="M0 0" style="mix-blend-mode: multiply" />')),
		).toThrow(/mix-blend-mode/);
	});

	it("fails on a root attribute neither dropped nor lifted", () => {
		expect(() =>
			convert(svg('<path d="M0 0" />', 'viewBox="0 0 18 18" opacity="0.5"')),
		).toThrow(/root <svg> carries opacity/);
	});

	it("fails on a definition in <defs> that lifting it out would draw", () => {
		expect(() => convert(svg('<defs><path d="M0 0" /></defs>'))).toThrow(
			/<defs> holds a <path>/,
		);
	});

	it("fails on a reference to an id the asset does not define, or to another file", () => {
		expect(() =>
			convert(svg('<path d="M0 0" fill="url(#nowhere)" />')),
		).toThrow(/#nowhere/);
		expect(() =>
			convert(
				svg('<linearGradient id="g" href="other.svg#g" /><path d="M0 0" />'),
			),
		).toThrow(/links outside the asset/);
	});
});

describe("convertIconSetSvg: ids", () => {
	it("renames a referenced id and moves every reference onto it, href included", () => {
		const { nodes, idRefs } = convert(
			svg(
				'<defs><linearGradient id="a"><stop offset="0" stop-color="#fff" /></linearGradient>' +
					'<linearGradient id="b" xlink:href="#a" /></defs>' +
					'<path d="M0 0" fill="url(#b)" />',
			),
		);

		expect(idRefs).toEqual(["set-icon-0", "set-icon-1"]);
		expect(nodes).toEqual([
			[
				"linearGradient",
				{ id: "set-icon-0" },
				[["stop", { offset: "0", stopColor: "#fff" }]],
			],
			["linearGradient", { id: "set-icon-1", href: "#set-icon-0" }],
			["path", { d: "M0 0", fill: "url(#set-icon-1)" }],
		]);
	});

	it("drops an id nothing refers to", () => {
		const { nodes, idRefs } = convert(
			svg(
				'<g id="Layer_1"><path id="p" d="M0 0" /></g>',
				'id="root" viewBox="0 0 18 18"',
			),
		);

		expect(idRefs).toEqual([]);
		expect(nodes).toEqual([["path", { d: "M0 0" }]]);
	});
});

describe("convertIconSetSvg: clipPaths", () => {
	it("drops a clipPath over the whole viewBox and the clip-path pointing at it", () => {
		const { nodes, idRefs } = convert(
			svg(
				'<g clip-path="url(#c)"><path d="M0 0" fill="#000" /></g>' +
					'<defs><clipPath id="c"><rect width="18" height="18" /></clipPath></defs>',
			),
		);

		expect(idRefs).toEqual([]);
		expect(nodes).toEqual([["path", { d: "M0 0", fill: "#000" }]]);
	});

	it("keeps a clipPath that clips, and clip-rule only where a clipPath reads it", () => {
		const { nodes } = convert(
			svg(
				'<path d="M0 0" clip-rule="evenodd" fill-rule="evenodd" />' +
					'<g clip-path="url(#c)"><path d="M1 1" /></g>' +
					'<clipPath id="c"><path d="M2 2" clip-rule="evenodd" /></clipPath>',
			),
		);

		expect(nodes).toEqual([
			["path", { d: "M0 0", fillRule: "evenodd" }],
			["g", { clipPath: "url(#set-icon-0)" }, [["path", { d: "M1 1" }]]],
			[
				"clipPath",
				{ id: "set-icon-0" },
				[["path", { d: "M2 2", clipRule: "evenodd" }]],
			],
		]);
	});
});

describe("convertIconSetSvg: the root", () => {
	it("moves a painting root attribute onto a <g> around the drawing", () => {
		const { nodes } = convert(
			svg(
				'<path d="M0 0" fill="#000" />',
				'width="18" height="18" viewBox="0 0 18 18" fill="none" version="1.1"',
			),
		);

		expect(nodes).toEqual([
			["g", { fill: "none" }, [["path", { d: "M0 0", fill: "#000" }]]],
		]);
	});

	it("reads the viewBox by its exact name, and builds one where it is misspelled", () => {
		expect(
			convert(
				svg('<path d="M0 0" />', 'xviewBox="0 0 18 18" width="18" height="17"'),
			).viewBox,
		).toBe("0 0 18 17");
		expect(() =>
			convert(svg('<path d="M0 0" />', 'xviewBox="0 0 18 18"')),
		).toThrow(/no viewBox/);
	});
});

describe("convertIconSetSvg: styles", () => {
	it("expands class rules into attributes and drops the stylesheet", () => {
		const { nodes } = convert(
			svg(
				"<defs><style>.cls-1{fill:#0078d4;}.cls-2{fill:url(#g);opacity:0.5}</style>" +
					'<linearGradient id="g"><stop offset="1" /></linearGradient></defs>' +
					'<title>An icon</title><rect class="cls-1" width="2" height="3" />' +
					'<path class="cls-2" d="M0 0" data-name="Path 1" />',
			),
		);

		expect(nodes).toEqual([
			["linearGradient", { id: "set-icon-0" }, [["stop", { offset: "1" }]]],
			["rect", { fill: "#0078d4", width: "2", height: "3" }],
			["path", { fill: "url(#set-icon-0)", opacity: "0.5", d: "M0 0" }],
		]);
	});

	it("fails on a rule that is not a single class selector, or one that overrides an attribute", () => {
		expect(() =>
			convert(svg('<style>path{fill:red}</style><path d="M0 0" />')),
		).toThrow(/single class selector/);
		expect(() =>
			convert(
				svg(
					'<style>.a{fill:red}</style><path class="a" fill="blue" d="M0 0" />',
				),
			),
		).toThrow(/gets fill from both \.a and an attribute/);
	});

	it("drops isolation: isolate in both forms", () => {
		const { nodes } = convert(
			svg(
				'<path d="M0 0" isolation="isolate" /><rect width="1" height="1" style="isolation: isolate" />',
			),
		);

		expect(nodes).toEqual([
			["path", { d: "M0 0" }],
			["rect", { width: "1", height: "1" }],
		]);
	});
});

describe("formatting the two modules", () => {
	it("writes the catalog without drawings and the drawings without metadata", () => {
		const catalog = formatIconSetCatalogModule({
			header: "Generated.\n\nSource: x",
			preamble: 'export const SOURCE = "x";',
			entryType: { name: "TestEntry", from: "./TestEntry" },
			entriesName: "TEST_ENTRIES",
			entries: [
				{
					name: "a/b",
					fields: { label: "B", category: "A", viewBox: "0 0 1 1" },
				},
			],
		});
		const drawings = formatIconSetDrawingsModule({
			header: "Generated.",
			drawingsName: "TEST_DRAWINGS",
			drawings: [
				{ name: "a/b", nodes: [["rect", { width: "1" }]], idRefs: [] },
			],
		});

		expect(catalog).toMatch(/^\/\/ Generated\.\n\/\/\n\/\/ Source: x\n/);
		expect(catalog).toContain('"a/b": {\n\t\tlabel: "B",');
		expect(catalog).not.toContain("nodes");
		expect(drawings).toContain(
			'import type { IconSetDrawing } from "@jiscribe/canvas-sdk/doc";',
		);
		expect(drawings).toContain('["rect", { width: "1" }],');
		expect(drawings).not.toContain("idRefs");
		expect(drawings).not.toContain("label");
	});
});

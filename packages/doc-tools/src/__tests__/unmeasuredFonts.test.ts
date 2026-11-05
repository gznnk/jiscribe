import type { CanvasDoc } from "@jiscribe/doc";
import { DEFAULT_FONT_FAMILY } from "@jiscribe/doc/unstable";
import { describe, expect, it } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import type { Diagnostic } from "../Diagnostic";
import { isFontStackMeasured } from "../measure/fontSourcePackages";
import { validateDoc } from "../validateDoc";

/** Parses the objects as a document's root, failing on anything the parser reports. */
const docOf = (...objects: Record<string, unknown>[]): CanvasDoc => {
	const result = validateDoc(JSON.stringify({ version: 1, root: objects }));
	if (result.doc === undefined || result.diagnostics.length > 0) {
		throw new Error(
			result.diagnostics.map((diagnostic) => diagnostic.message).join("; "),
		);
	}
	return result.doc;
};

/** The document-wide findings about estimated fonts, and nothing else diagnoseDoc says. */
const findFontWarnings = (doc: CanvasDoc): Diagnostic[] =>
	diagnoseDoc(doc).filter((diagnostic) =>
		diagnostic.message.startsWith("fontFamily "),
	);

const UNSHIPPED = '"Comic Sans MS", cursive';

/** A roomy rect, so nothing but the font is worth a remark. */
const box = (id: string, x: number, extra: Record<string, unknown> = {}) => ({
	id,
	type: "rect",
	x,
	y: 0,
	width: 300,
	height: 100,
	text: "label",
	...extra,
});

describe("isFontStackMeasured", () => {
	it.each([
		[DEFAULT_FONT_FAMILY, true],
		['"Comic Sans MS", "Noto Sans JP", sans-serif', true],
		[UNSHIPPED, false],
		["sans-serif", false],
		["", false],
	])("answers %j with %s", (fontFamily, expected) => {
		expect(isFontStackMeasured(fontFamily)).toBe(expected);
	});
});

describe("text set in a font the canvas does not ship", () => {
	it("is named in one document-wide warning per stack, after the per-object findings", () => {
		const diagnostics = diagnoseDoc(
			docOf(
				box("a", 0, { fontFamily: UNSHIPPED }),
				box("cramped", 400, {
					width: 40,
					height: 20,
					text: "この箱には到底入りきらない長さの説明文",
				}),
				box("b", 800, { fontFamily: UNSHIPPED }),
			),
		);
		expect(diagnostics.map((diagnostic) => diagnostic.objectId)).toEqual([
			"cramped",
			undefined,
		]);
		expect(diagnostics[1]).toEqual({
			severity: "warning",
			message: `fontFamily "${UNSHIPPED}" names no font the canvas ships (or none whose font files are installed here), so text set in it is measured at an estimated 0.6em per character: a, b; overflow and line-break findings on this document are approximate`,
		});
	});

	it("says nothing about a stack that names a shipped family", () => {
		expect(
			findFontWarnings(
				docOf(box("a", 0, { fontFamily: '"Noto Serif JP", serif' })),
			),
		).toEqual([]);
	});

	it("finds the family on a run, a record slot, a table cell, an entity name and a connector label", () => {
		const styled = { text: "x", fontFamily: UNSHIPPED };
		const diagnostics = findFontWarnings(
			docOf(
				box("runs", 0, { text: [{ text: "a" }, { ...styled }] }),
				{
					id: "record",
					type: "record",
					x: 0,
					y: 200,
					width: 200,
					height: 120,
					text: { name: styled },
				},
				{
					id: "table",
					type: "table",
					x: 0,
					y: 400,
					columns: [{ width: 100 }],
					rows: [{}],
					cells: [[styled]],
				},
				{
					id: "entity",
					type: "erEntity",
					x: 0,
					y: 600,
					name: styled,
					columns: [{ name: "id" }],
				},
				box("s", 400),
				box("t", 800),
				{
					id: "edge",
					type: "connector",
					points: [],
					source: {
						owner: { id: "s" },
						anchor: { kind: "connectPoint", id: "rightCenter" },
					},
					target: {
						owner: { id: "t" },
						anchor: { kind: "connectPoint", id: "leftCenter" },
					},
					label: { text: "go", fontFamily: UNSHIPPED },
				},
			),
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].message).toContain(
			": runs, record, table, entity, edge;",
		);
	});

	it("passes over objects with no text to measure, and a markdown body", () => {
		expect(
			findFontWarnings(
				docOf(
					box("empty", 0, { text: "", fontFamily: UNSHIPPED }),
					box("blank", 400, { text: undefined, fontFamily: UNSHIPPED }),
					{
						id: "md",
						type: "markdown",
						x: 0,
						y: 200,
						width: 300,
						height: 200,
						text: "# Title",
						fontFamily: UNSHIPPED,
					},
				),
			),
		).toEqual([]);
	});

	it("does not look into a group's children for the group, nor into meta", () => {
		const diagnostics = findFontWarnings(
			docOf(
				{
					id: "group",
					type: "group",
					children: [box("child", 0, { fontFamily: UNSHIPPED })],
				},
				box("tagged", 400, { meta: { fontFamily: UNSHIPPED } }),
			),
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].message).toContain(": child;");
	});

	it("names the first ten objects and counts the rest", () => {
		const boxes = Array.from({ length: 12 }, (_, index) =>
			box(`b${index}`, index * 400, { fontFamily: UNSHIPPED }),
		);
		const diagnostics = findFontWarnings(docOf(...boxes));
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].message).toContain(
			": b0, b1, b2, b3, b4, b5, b6, b7, b8, b9 and 2 more;",
		);
	});
});

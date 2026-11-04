import type { CanvasDoc } from "@jiscribe/doc";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";
import { describe, expect, it } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import type { Diagnostic } from "../Diagnostic";
import { BOX_FILLING_TYPES } from "../occludedObjects";
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

/** The findings about something hidden, and nothing else diagnoseDoc says. */
const findOcclusions = (doc: CanvasDoc): Diagnostic[] =>
	diagnoseDoc(doc).filter((diagnostic) =>
		diagnostic.message.includes(" is hidden: "),
	);

/** A filled square with no stroke and no text, to be hidden. */
const square = (
	id: string,
	x: number,
	y: number,
	size: number,
	extra: Record<string, unknown> = {},
) => ({
	id,
	type: "rect",
	x,
	y,
	width: size,
	height: size,
	fill: "#336699",
	strokeWidth: 0,
	...extra,
});

/** A rect painted opaque over the 0..100 square. */
const opaqueCover = (extra: Record<string, unknown> = {}) => ({
	id: "cover",
	type: "rect",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: "#ffffff",
	...extra,
});

describe("BOX_FILLING_TYPES", () => {
	it.each([...BOX_FILLING_TYPES])(
		"%s is a shipped type with a fill",
		(type) => {
			expect(standardObjectDocDefinitions.get(type)?.features.fill).toBe(true);
		},
	);
});

describe("an object hidden under an opaque fill", () => {
	it("is reported on the hidden object, naming the cover, its fill and the two ways out", () => {
		const diagnostics = diagnoseDoc(
			docOf(square("under", 10, 10, 50), opaqueCover()),
		);
		expect(diagnostics).toEqual([
			{
				severity: "warning",
				objectId: "under",
				message:
					"rect under is hidden: rect cover is drawn over it and its opaque fill (#ffffff) covers all of it; bring under forward with reorder_objects, or make the fill of cover transparent with set_style",
			},
		]);
	});

	it("is not reported when the cover is drawn first", () => {
		expect(
			findOcclusions(docOf(opaqueCover(), square("over", 10, 10, 50))),
		).toEqual([]);
	});

	it("is not reported for a partial overlap", () => {
		expect(
			findOcclusions(docOf(square("under", 80, 80, 50), opaqueCover())),
		).toEqual([]);
	});

	it.each([
		["transparent", { fill: "transparent" }],
		["a translucent hex", { fill: "#ffffff80" }],
		["a translucent rgba()", { fill: "rgba(255, 255, 255, 0.5)" }],
		["a var()", { fill: "var(--paper)" }],
		["a fillOpacity below 1", { fillOpacity: 0.9 }],
		[
			"no fill at all, the type's default being transparent",
			{ fill: undefined },
		],
	])("is not reported under %s", (_label, coverStyle) => {
		expect(
			findOcclusions(
				docOf(square("under", 10, 10, 50), opaqueCover(coverStyle)),
			),
		).toEqual([]);
	});

	it("is reported under the theme's surface, which `auto` paints opaque", () => {
		expect(
			findOcclusions(
				docOf(square("under", 10, 10, 50), opaqueCover({ fill: "auto" })),
			),
		).toHaveLength(1);
	});

	it("is not reported under a type whose silhouette is not its box", () => {
		expect(
			findOcclusions(
				docOf(square("under", 40, 40, 20), {
					...opaqueCover(),
					type: "diamond",
				}),
			),
		).toEqual([]);
	});

	it("is not reported where either side is rotated", () => {
		expect(
			findOcclusions(
				docOf(square("under", 10, 10, 50), opaqueCover({ rotation: 45 })),
			),
		).toEqual([]);
		expect(
			findOcclusions(
				docOf(square("under", 10, 10, 50, { rotation: 30 }), opaqueCover()),
			),
		).toEqual([]);
	});

	it("is reported where the rotation is a whole turn", () => {
		expect(
			findOcclusions(
				docOf(square("under", 10, 10, 50), opaqueCover({ rotation: 360 })),
			),
		).toHaveLength(1);
	});

	it("is not reported for a shape whose label hangs outside its box", () => {
		const actor = {
			id: "person",
			type: "actor",
			x: 30,
			y: 30,
			width: 20,
			height: 30,
			strokeWidth: 0,
		};
		expect(
			findOcclusions(docOf({ ...actor, text: "利用者" }, opaqueCover())),
		).toEqual([]);
		// With no label, the box is all the pictogram draws.
		expect(findOcclusions(docOf(actor, opaqueCover()))).toHaveLength(1);
	});

	it("is not reported for a line with an arrowhead, which reaches past its points", () => {
		const line = {
			id: "line",
			type: "polyline",
			points: [
				{ x: 20, y: 50 },
				{ x: 80, y: 50 },
			],
		};
		expect(
			findOcclusions(
				docOf({ ...line, endArrow: "FilledTriangle" }, opaqueCover()),
			),
		).toEqual([]);
		// A zero-height line is still covered, its stroke counted.
		expect(findOcclusions(docOf(line, opaqueCover()))).toHaveLength(1);
	});

	it("is not reported for a plain shape that paints nothing, an invisible anchor", () => {
		const anchor = square("anchor", 10, 10, 2, {
			fill: "transparent",
			stroke: "transparent",
		});
		expect(findOcclusions(docOf(anchor, opaqueCover()))).toEqual([]);
		// Paint either way, and there is something to hide.
		expect(
			findOcclusions(docOf({ ...anchor, fill: "#000000" }, opaqueCover())),
		).toHaveLength(1);
		expect(
			findOcclusions(
				docOf({ ...anchor, strokeWidth: 1, stroke: "#000000" }, opaqueCover()),
			),
		).toHaveLength(1);
	});

	it("counts the hidden shape's stroke as part of what it draws", () => {
		// The 10px border reaches 5px past a box that touches the cover's edge.
		expect(
			findOcclusions(
				docOf(square("under", 0, 0, 50, { strokeWidth: 10 }), opaqueCover()),
			),
		).toEqual([]);
		expect(
			findOcclusions(
				docOf(square("under", 5, 5, 50, { strokeWidth: 10 }), opaqueCover()),
			),
		).toHaveLength(1);
	});

	it("checks a rounded cover's corners against the arc SVG trims rx to", () => {
		// rx 80 is trimmed to 50, half the side: the cover is a circle.
		const roundCover = opaqueCover({ rx: 80 });
		expect(
			findOcclusions(docOf(square("corner", 0, 0, 10), roundCover)),
		).toEqual([]);
		expect(
			findOcclusions(docOf(square("middle", 40, 40, 20), roundCover)),
		).toHaveLength(1);
	});

	it("checks the corners of what is hidden against an ellipse cover", () => {
		const ellipseCover = {
			id: "cover",
			type: "ellipse",
			cx: 50,
			cy: 50,
			rx: 50,
			ry: 50,
			fill: "white",
		};
		// The corners of an 80-wide square around the centre fall outside the circle.
		expect(
			findOcclusions(docOf(square("wide", 10, 10, 80), ellipseCover)),
		).toEqual([]);
		expect(
			findOcclusions(docOf(square("inside", 25, 25, 50), ellipseCover)),
		).toHaveLength(1);
	});

	it("compares a group's children one by one, in the order they are drawn", () => {
		const diagnostics = findOcclusions(
			docOf(
				{
					id: "group",
					type: "group",
					children: [
						square("child", 10, 10, 20),
						square("other", 300, 300, 20),
					],
				},
				opaqueCover(),
			),
		);
		expect(diagnostics.map((diagnostic) => diagnostic.objectId)).toEqual([
			"child",
		]);
	});

	it("reports a shape stacked on an identical copy of itself, where neither strokes its outline", () => {
		const diagnostics = findOcclusions(
			docOf(
				opaqueCover({ id: "first", strokeWidth: 0 }),
				opaqueCover({ id: "second", strokeWidth: 0 }),
			),
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ objectId: "first" });
		expect(diagnostics[0].message).toMatch(
			/^rect first is hidden: rect second /,
		);
	});

	it("passes over an identical copy whose border reaches past the fill above it", () => {
		// The cover's own border is not counted as covering, and half the lower
		// copy's border lies outside the box.
		expect(
			findOcclusions(
				docOf(opaqueCover({ id: "first" }), opaqueCover({ id: "second" })),
			),
		).toEqual([]);
	});

	it("names the cover drawn directly over the hidden shape when several hide it", () => {
		const diagnostics = findOcclusions(
			docOf(
				square("under", 10, 10, 20),
				opaqueCover({ id: "lower", strokeWidth: 0 }),
				opaqueCover({ id: "upper", strokeWidth: 0 }),
			),
		);
		expect(
			diagnostics.map((diagnostic) => [
				diagnostic.objectId,
				diagnostic.message,
			]),
		).toEqual([
			["under", expect.stringMatching(/^rect under is hidden: rect lower /)],
			["lower", expect.stringMatching(/^rect lower is hidden: rect upper /)],
		]);
	});

	it("sits among the other findings in document order", () => {
		const diagnostics = diagnoseDoc(
			docOf(
				square("under", 10, 10, 20),
				{
					id: "cramped",
					type: "rect",
					x: 300,
					y: 0,
					width: 60,
					height: 40,
					text: "この箱には到底入りきらない長さの説明文",
					fontSize: 14,
				},
				opaqueCover(),
			),
		);
		expect(diagnostics.map((diagnostic) => diagnostic.objectId)).toEqual([
			"under",
			"cramped",
		]);
	});

	it("is reported for an image, an svg and a text hidden under a cover", () => {
		const diagnostics = findOcclusions(
			docOf(
				{
					id: "photo",
					type: "image",
					x: 10,
					y: 10,
					width: 20,
					height: 20,
					src: "photo.png",
				},
				{
					id: "mark",
					type: "svg",
					x: 40,
					y: 10,
					width: 20,
					height: 20,
					svgText: "<svg xmlns='http://www.w3.org/2000/svg'/>",
				},
				{ id: "caption", type: "text", x: 10, y: 60, text: "hi", fontSize: 12 },
				opaqueCover(),
			),
		);
		expect(diagnostics.map((diagnostic) => diagnostic.objectId)).toEqual([
			"photo",
			"mark",
			"caption",
		]);
	});
});

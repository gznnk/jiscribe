import type { SemanticDiagnostic } from "@workspace/canvas/doc";
import { describe, it, expect } from "vitest";

import { validateCalloutDoc } from "../validateCalloutDoc";

const validCallout = {
	x: 10,
	y: 20,
	width: 160,
	height: 110,
	rotation: 0,
	stroke: "#000",
	strokeWidth: 2,
	fill: "#fff",
	text: "hello",
	textAlign: "center",
	tail: { side: "bottom", position: 0.2 },
};

const paths = (errors: SemanticDiagnostic[]): string[] =>
	errors.map((e) => e.path);

describe("validateCalloutDoc", () => {
	it("yields no error for a valid Callout", () => {
		expect(validateCalloutDoc(validCallout, "root")).toEqual([]);
	});

	it("still validates the inherited Frame fields", () => {
		const errors = validateCalloutDoc({ ...validCallout, width: -1 }, "root");
		expect(paths(errors)).toEqual(["root.width"]);
	});
});

describe("validateCalloutDoc tail", () => {
	it("treats an absent tail as valid (it falls back to the default)", () => {
		const { tail: _tail, ...withoutTail } = validCallout;
		expect(validateCalloutDoc(withoutTail, "root")).toEqual([]);
	});

	it("treats an explicit undefined tail as valid", () => {
		expect(
			validateCalloutDoc({ ...validCallout, tail: undefined }, "root"),
		).toEqual([]);
	});

	it("is an error when tail is not an object", () => {
		const errors = validateCalloutDoc(
			{ ...validCallout, tail: "bottom" },
			"root",
		);
		expect(paths(errors)).toEqual(["root.tail"]);
	});

	it.each(["top", "right", "bottom", "left"])("accepts the %s side", (side) => {
		const doc = { ...validCallout, tail: { side, position: 0.5 } };
		expect(validateCalloutDoc(doc, "root")).toEqual([]);
	});

	it.each([["center"], [undefined], [0]])(
		"is an error when side is %p",
		(side) => {
			const doc = { ...validCallout, tail: { side, position: 0.5 } };
			expect(paths(validateCalloutDoc(doc, "root"))).toEqual([
				"root.tail.side",
			]);
		},
	);

	it("accepts the inclusive bounds of position", () => {
		for (const position of [0, 1]) {
			const doc = { ...validCallout, tail: { side: "top", position } };
			expect(validateCalloutDoc(doc, "root")).toEqual([]);
		}
	});

	it.each([[-0.01], [1.01], ["0.5"], [undefined]])(
		"is an error when position is %p",
		(position) => {
			const doc = { ...validCallout, tail: { side: "top", position } };
			expect(paths(validateCalloutDoc(doc, "root"))).toEqual([
				"root.tail.position",
			]);
		},
	);

	it("reports side and position independently", () => {
		const doc = { ...validCallout, tail: { side: "center", position: 2 } };
		expect(paths(validateCalloutDoc(doc, "root"))).toEqual([
			"root.tail.side",
			"root.tail.position",
		]);
	});

	it("prefixes the tail diagnostics with the given path", () => {
		const doc = { ...validCallout, tail: { side: "center", position: 0.5 } };
		expect(paths(validateCalloutDoc(doc, "root.children[1]"))).toEqual([
			"root.children[1].tail.side",
		]);
	});
});

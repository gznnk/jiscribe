import { describe, expect, it } from "vitest";

import { DocOperationError } from "../errors";
import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
	twoConnectedRects,
} from "./support/docFixtures";

describe("setStyle", () => {
	it("colours a shape and reports nothing ignored", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		const result = docOps.setStyle(doc, ["rect-1"], {
			fill: "#e3f2fd",
			fontColor: "#0d47a1",
		});

		expect(result).toEqual({ styledIds: ["rect-1"], ignored: [] });
		expect(readObject(doc, "rect-1")).toMatchObject({
			fill: "#e3f2fd",
			fontColor: "#0d47a1",
		});
		expectValid(doc);
	});

	it("wins over the ranges a property was set on part of the text", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		const rect = readObject(doc, "rect-1");
		rect.text = [
			{ text: "yes" },
			{ text: " (2FA)", fontColor: "#d32f2f", fontWeight: "bold" },
		];

		docOps.setStyle(doc, ["rect-1"], { fontColor: "#0d47a1" });

		// Only the styled property is dropped from the run; the rest of it stays.
		expect(readObject(doc, "rect-1")).toMatchObject({
			fontColor: "#0d47a1",
			text: [{ text: "yes" }, { text: " (2FA)", fontWeight: "bold" }],
		});
		expectValid(doc);
	});

	it("styles the line of a connector and reports the rest as ignored", () => {
		const doc = twoConnectedRects();

		const result = docOps.setStyle(doc, ["connector-1"], {
			stroke: "#c62828",
			strokeDashType: "dashed",
			fill: "#ffffff",
		});

		expect(readObject(doc, "connector-1")).toMatchObject({
			stroke: "#c62828",
			strokeDashType: "dashed",
		});
		// A connector's fill belongs to its label, and this one has none yet.
		expect(result.ignored).toEqual([
			{ id: "connector-1", properties: ["fill"] },
		]);
		expectValid(doc);
	});

	it("sends a connector's fill and typography to its label once it has one", () => {
		const doc = twoConnectedRects();
		docOps.setText(doc, "connector-1", "yes");

		const result = docOps.setStyle(doc, ["connector-1"], {
			fill: "#ffffff",
			fontSize: 12,
		});

		expect(readObject(doc, "connector-1").label).toMatchObject({
			text: "yes",
			fill: "#ffffff",
			fontSize: 12,
		});
		expect(result.ignored).toEqual([]);
		expectValid(doc);
	});

	it("leaves every object untouched when any id is missing", () => {
		const doc = twoConnectedRects();

		expect(() =>
			docOps.setStyle(doc, ["rect-1", "missing"], { fill: "#000000" }),
		).toThrow(DocOperationError);
		expect(readObject(doc, "rect-1").fill).not.toBe("#000000");
	});
});

describe("setStyle: values the document could not hold", () => {
	// The constraints themselves live in the doc validators; what is checked here is
	// that they run before anything is written, so a refused call leaves no trace.
	it.each([
		["a colour that breaks out of its declaration", { fill: "red; } body {" }],
		["a colour naming a url", { stroke: "url(http://evil.example/x)" }],
		["a font family that breaks out", { fontFamily: "a; } body {" }],
		["a font size below the schema minimum", { fontSize: 0 }],
		["a font size that is not a number", { fontSize: Number.NaN }],
		["a negative stroke width", { strokeWidth: -5 }],
		["a dash type the document has no name for", { strokeDashType: "double" }],
		["a stroke width of infinity", { strokeWidth: Number.POSITIVE_INFINITY }],
		["a font size of infinity", { fontSize: Number.POSITIVE_INFINITY }],
	])("refuses %s", (_label, style) => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		const before = structuredClone(doc.root);

		expect(() => docOps.setStyle(doc, ["rect-1"], style as never)).toThrow(
			DocOperationError,
		);
		expect(doc.root).toEqual(before);
		expectValid(doc);
	});

	it("names every property it refuses, not just the first", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });

		expect(() =>
			docOps.setStyle(doc, ["rect-1"], {
				fill: "red; }",
				fontSize: 0,
			} as never),
		).toThrow(/fill.*fontSize|fontSize.*fill/s);
	});

	it("refuses on addObject too, which styles what the factory built", () => {
		const doc = emptyDoc();

		expect(() =>
			docOps.addObject(doc, "rect", {
				x: 0,
				y: 0,
				fill: "url(http://evil.example/x)",
			} as never),
		).toThrow(DocOperationError);
		expect(doc.root).toEqual([]);
	});

	it("still writes a property the type has no place for as ignored, not refused", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "ellipse", { x: 0, y: 0 });

		// rx is valid in itself; an ellipse simply has no corner to round
		const result = docOps.setStyle(doc, ["ellipse-1"], { rx: 4 });

		expect(result.ignored).toEqual([{ id: "ellipse-1", properties: ["rx"] }]);
	});
});

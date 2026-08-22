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

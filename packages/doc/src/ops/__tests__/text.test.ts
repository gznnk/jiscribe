import { describe, expect, it } from "vitest";

import {
	docOps,
	emptyDoc,
	expectValid,
	readObject,
	twoConnectedRects,
	twoRects,
} from "./support/docFixtures";
import { cardDefinition } from "./support/pluginFixtures";
import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../../model/objects/base/ObjectDoc";
import { createFrameObjectFactory } from "../../model/objects/utils/createFrameObjectFactory";
import { createDocOps } from "../createDocOps";
import { DocOperationError } from "../errors";

describe("setText", () => {
	it("rewrites a single-body shape's text", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, text: "yes" });

		docOps.setText(doc, "rect-1", "yes (2FA off)");

		expect(readObject(doc, "rect-1").text).toBe("yes (2FA off)");
		expectValid(doc);
	});

	it("labels a connector, and drops the label when set to empty", () => {
		const doc = twoConnectedRects();

		docOps.setText(doc, "connector-1", "on failure");
		expect(readObject(doc, "connector-1").label).toEqual({
			text: "on failure",
		});
		expectValid(doc);

		docOps.setText(doc, "connector-1", "");
		expect(readObject(doc, "connector-1").label).toBeUndefined();
	});

	it("refuses a type that holds no text", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.addObject(doc, "rect", { x: 200, y: 0 });
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(() => docOps.setText(doc, groupId, "nope")).toThrow(
			DocOperationError,
		);
	});

	it("styles the stretch of text named by what it holds", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, text: "Payment failed" });

		docOps.setInlineTextStyle(doc, "rect-1", {
			match: "failed",
			fontColor: "#d32f2f",
			fontWeight: "bold",
		});

		expect(readObject(doc, "rect-1").text).toEqual([
			{ text: "Payment " },
			{ text: "failed", fontColor: "#d32f2f", fontWeight: "bold" },
		]);
		expectValid(doc);
	});

	it("styles every occurrence, or the one asked for", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, text: "a b a" });

		docOps.setInlineTextStyle(doc, "rect-1", {
			match: "a",
			fontWeight: "bold",
		});
		expect(readObject(doc, "rect-1").text).toEqual([
			{ text: "a", fontWeight: "bold" },
			{ text: " b " },
			{ text: "a", fontWeight: "bold" },
		]);

		const single = emptyDoc();
		docOps.addObject(single, "rect", { x: 0, y: 0, text: "a b a" });
		docOps.setInlineTextStyle(single, "rect-1", {
			match: "a",
			occurrence: 2,
			fontWeight: "bold",
		});
		expect(readObject(single, "rect-1").text).toEqual([
			{ text: "a b " },
			{ text: "a", fontWeight: "bold" },
		]);
	});

	it("refuses a stretch that does not occur, or an occurrence past the last", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, text: "Payment failed" });

		expect(() =>
			docOps.setInlineTextStyle(doc, "rect-1", {
				match: "missing",
				fontWeight: "bold",
			}),
		).toThrow(DocOperationError);
		expect(() =>
			docOps.setInlineTextStyle(doc, "rect-1", {
				match: "failed",
				occurrence: 2,
				fontWeight: "bold",
			}),
		).toThrow(DocOperationError);
		// The failed calls left the text exactly as it was.
		expect(readObject(doc, "rect-1").text).toBe("Payment failed");
	});

	it("refuses a connector, whose label is styled as a whole", () => {
		const doc = twoConnectedRects();
		docOps.setText(doc, "connector-1", "on failure");

		expect(() =>
			docOps.setInlineTextStyle(doc, "connector-1", {
				match: "failure",
				fontWeight: "bold",
			}),
		).toThrow(DocOperationError);
	});

	it("keeps the styling of the characters a rewrite leaves in place", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		const rect = readObject(doc, "rect-1");
		rect.text = [{ text: "yes" }, { text: " (2FA)", fontWeight: "bold" }];

		docOps.setText(doc, "rect-1", "yes (2FA off)");

		expect(readObject(doc, "rect-1").text).toEqual([
			{ text: "yes" },
			{ text: " (2FA off)", fontWeight: "bold" },
		]);
		expectValid(doc);
	});
});

describe("setText on a slotted type", () => {
	const slotOps = createDocOps({
		plugins: [{ id: "slot-plugin", objects: { "slot-card": cardDefinition } }],
	});
	const slottedDoc = (): CanvasDoc => ({
		version: 1,
		root: [
			{
				id: "card-1",
				type: "slot-card",
				x: 0,
				y: 0,
				width: 180,
				height: 90,
				text: {
					name: { text: "User" },
					attributes: { text: ["id", "email"] },
				},
			} as unknown as ObjectDoc,
		],
	});

	it("writes a string slot as it is and a rows slot one line per row", () => {
		const doc = slottedDoc();

		slotOps.setText(doc, "card-1", "Account", "name");
		slotOps.setText(doc, "card-1", "id\nemail\nrole", "attributes");

		expect(readObject(doc, "card-1").text).toEqual({
			name: { text: "Account" },
			attributes: { text: ["id", "email", "role"] },
		});
	});

	it("names the available slots when the slot is missing or unknown", () => {
		const doc = slottedDoc();

		expect(() => slotOps.setText(doc, "card-1", "x")).toThrow(
			/name \/ attributes/,
		);
		expect(() => slotOps.setText(doc, "card-1", "x", "operations")).toThrow(
			/name \/ attributes/,
		);
	});

	it("styles every slot at once", () => {
		const doc = slottedDoc();

		slotOps.setStyle(doc, ["card-1"], { fontSize: 18 });

		expect(readObject(doc, "card-1").text).toMatchObject({
			name: { fontSize: 18 },
			attributes: { fontSize: 18 },
		});
	});

	it("wins over the ranges a property was set on inside a row", () => {
		const doc = slottedDoc();
		const slots = readObject(doc, "card-1").text as Record<
			string,
			Record<string, unknown>
		>;
		slots.attributes.text = ["id", [{ text: "email", fontWeight: "bold" }]];

		slotOps.setStyle(doc, ["card-1"], { fontWeight: "normal" });

		// The row's override is gone, so the slot's value shows on it; the row
		// collapses back to a plain string once nothing is styled on its own.
		expect(readObject(doc, "card-1").text).toEqual({
			name: { text: "User", fontWeight: "normal" },
			attributes: { text: ["id", "email"], fontWeight: "normal" },
		});
	});

	it("keeps two objects created from the same defaults independent", () => {
		const factoryOps = createDocOps({
			plugins: [
				{
					id: "slot-factory-plugin",
					objects: {
						"slot-card": {
							...cardDefinition,
							factory: createFrameObjectFactory({
								type: "slot-card",
								width: 180,
								height: 90,
								text: {
									name: { text: "" },
									attributes: { text: [] as string[] },
								},
							}),
						},
					},
				},
			],
		});
		const doc = emptyDoc();
		const firstId = factoryOps.addObject(doc, "slot-card", { x: 0, y: 0 });
		const secondId = factoryOps.addObject(doc, "slot-card", { x: 300, y: 0 });

		factoryOps.setText(doc, firstId, "User", "name");
		factoryOps.setStyle(doc, [firstId], { fontSize: 18 });

		expect(readObject(doc, secondId).text).toEqual({
			name: { text: "" },
			attributes: { text: [] },
		});
	});
});

describe("getText", () => {
	const slotOps = createDocOps({
		plugins: [{ id: "slot-plugin", objects: { "slot-card": cardDefinition } }],
	});
	/** One `slot-card`, with the slots the argument names. */
	const cardDoc = (slots: Record<string, unknown>): CanvasDoc => ({
		version: 1,
		root: [
			{
				id: "card-1",
				type: "slot-card",
				x: 0,
				y: 0,
				width: 180,
				height: 90,
				text: slots,
			} as unknown as ObjectDoc,
		],
	});

	it("reads a single-body shape's text back as setText took it", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0 });
		docOps.setText(doc, "rect-1", "yes (2FA off)");

		expect(docOps.getText(doc, "rect-1")).toBe("yes (2FA off)");
	});

	it("drops the styling of a body styled in parts", () => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, text: "Payment failed" });
		docOps.setInlineTextStyle(doc, "rect-1", {
			match: "failed",
			fontWeight: "bold",
		});

		expect(docOps.getText(doc, "rect-1")).toBe("Payment failed");
	});

	it("reads a connector's label, and empty for one carrying none", () => {
		const doc = twoConnectedRects();
		expect(docOps.getText(doc, "connector-1")).toBe("");

		docOps.setText(doc, "connector-1", "on failure");
		expect(docOps.getText(doc, "connector-1")).toBe("on failure");
	});

	it("reads a named slot, rows joined one per line", () => {
		const doc = cardDoc({
			name: { text: "User" },
			attributes: { text: ["id", "email"] },
		});

		expect(slotOps.getText(doc, "card-1", "name")).toBe("User");
		expect(slotOps.getText(doc, "card-1", "attributes")).toBe("id\nemail");
	});

	it("takes the only slot when none is named, and names them all when there are two", () => {
		expect(slotOps.getText(cardDoc({ name: { text: "User" } }), "card-1")).toBe(
			"User",
		);
		expect(() =>
			slotOps.getText(
				cardDoc({ name: { text: "User" }, attributes: { text: [] } }),
				"card-1",
			),
		).toThrow(/name \/ attributes/);
	});

	it("refuses a type that holds no text", () => {
		const doc = twoRects();
		const groupId = docOps.groupObjects(doc, ["rect-1", "rect-2"]);

		expect(() => docOps.getText(doc, groupId)).toThrow(DocOperationError);
	});

	it("throws DocOperationError for an id the doc does not hold", () => {
		expect(() => docOps.getText(twoRects(), "nope")).toThrow(DocOperationError);
	});
});

describe("setTexts", () => {
	it("writes every entry, a connector label included", () => {
		const doc = twoConnectedRects();

		docOps.setTexts(doc, [
			{ id: "rect-1", text: "start" },
			{ id: "rect-2", text: "end" },
			{ id: "connector-1", text: "on failure" },
		]);

		expect(readObject(doc, "rect-1").text).toBe("start");
		expect(readObject(doc, "rect-2").text).toBe("end");
		expect(readObject(doc, "connector-1").label).toEqual({
			text: "on failure",
		});
		expectValid(doc);
	});

	it("lets the last entry for a repeated id win", () => {
		const doc = twoRects();

		docOps.setTexts(doc, [
			{ id: "rect-1", text: "first" },
			{ id: "rect-1", text: "second" },
		]);

		expect(readObject(doc, "rect-1").text).toBe("second");
	});

	it("leaves the doc untouched when a later entry is bad", () => {
		const doc = twoConnectedRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.setTexts(doc, [
				{ id: "rect-1", text: "start" },
				{ id: "rect-9", text: "end" },
			]),
		).toThrow(
			"entries[1] (rect-9): object not found: rect-9 — the document was left unchanged",
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("is a no-op for an empty array", () => {
		const doc = twoConnectedRects();
		const before = JSON.stringify(doc);

		docOps.setTexts(doc, []);

		expect(JSON.stringify(doc)).toBe(before);
	});

	it("matches setText for a single entry", () => {
		const singleDoc = twoConnectedRects();
		docOps.setText(singleDoc, "connector-1", "on failure");

		const batchDoc = twoConnectedRects();
		docOps.setTexts(batchDoc, [{ id: "connector-1", text: "on failure" }]);

		expect(JSON.stringify(batchDoc)).toBe(JSON.stringify(singleDoc));
	});
});

describe("setInlineTextStyles", () => {
	/** Two rects carrying the text the stretches below are matched against. */
	const twoLabelledRects = (): CanvasDoc => {
		const doc = emptyDoc();
		docOps.addObject(doc, "rect", { x: 0, y: 0, text: "Payment failed" });
		docOps.addObject(doc, "rect", { x: 300, y: 0, text: "Retry later" });
		return doc;
	};

	it("styles a stretch on each object", () => {
		const doc = twoLabelledRects();

		docOps.setInlineTextStyles(doc, [
			{ id: "rect-1", match: "failed", fontWeight: "bold" },
			{ id: "rect-2", match: "Retry", fontColor: "#1976d2" },
		]);

		expect(readObject(doc, "rect-1").text).toEqual([
			{ text: "Payment " },
			{ text: "failed", fontWeight: "bold" },
		]);
		expect(readObject(doc, "rect-2").text).toEqual([
			{ text: "Retry", fontColor: "#1976d2" },
			{ text: " later" },
		]);
		expectValid(doc);
	});

	// A repeated id is the way two stretches of one text get styled, so the entries stack
	// rather than the last one replacing what came before it.
	it("stacks two stretches of one text", () => {
		const doc = twoLabelledRects();

		docOps.setInlineTextStyles(doc, [
			{ id: "rect-1", match: "Payment", fontWeight: "bold" },
			{ id: "rect-1", match: "failed", fontColor: "#d32f2f" },
		]);

		expect(readObject(doc, "rect-1").text).toEqual([
			{ text: "Payment", fontWeight: "bold" },
			{ text: " " },
			{ text: "failed", fontColor: "#d32f2f" },
		]);
		expectValid(doc);
	});

	it("leaves the doc untouched when one match does not occur", () => {
		const doc = twoLabelledRects();
		const before = JSON.stringify(doc);

		expect(() =>
			docOps.setInlineTextStyles(doc, [
				{ id: "rect-1", match: "failed", fontWeight: "bold" },
				{ id: "rect-2", match: "missing", fontWeight: "bold" },
			]),
		).toThrow(
			'entries[1] (rect-2): rect-2 does not contain "missing" — the document was left unchanged',
		);
		expect(JSON.stringify(doc)).toBe(before);
	});

	it("is a no-op for an empty array", () => {
		const doc = twoLabelledRects();
		const before = JSON.stringify(doc);

		docOps.setInlineTextStyles(doc, []);

		expect(JSON.stringify(doc)).toBe(before);
	});

	it("matches setInlineTextStyle for a single entry", () => {
		const singleDoc = twoLabelledRects();
		docOps.setInlineTextStyle(singleDoc, "rect-1", {
			match: "failed",
			fontWeight: "bold",
		});

		const batchDoc = twoLabelledRects();
		docOps.setInlineTextStyles(batchDoc, [
			{ id: "rect-1", match: "failed", fontWeight: "bold" },
		]);

		expect(JSON.stringify(batchDoc)).toBe(JSON.stringify(singleDoc));
	});
});

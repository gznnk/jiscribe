import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { selectionOf } from "../../__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../__tests__/support/textSlotPartSelection";
import { vertexPartSelection } from "../../__tests__/support/vertexPartSelection";
import { selectTextSlot } from "../selectTextSlot";

/** A record-like shape spelling its text out as slots. */
const record: ObjectState = {
	id: "rec-1",
	type: "record",
	features: { text: "slots" },
	text: { name: { text: "User" }, rows: { text: ["id"] } },
} as unknown as ObjectState;

/** A shape holding one body, picked as its `body` slot. */
const rect: ObjectState = {
	id: "rect-1",
	type: "rect",
	features: { text: "body" },
	text: { body: { text: "hi" } },
} as unknown as ObjectState;

describe("selectTextSlot", () => {
	it("picks the slot on a type with slots", () => {
		expect(selectTextSlot(selectionOf([]), record, "rows")).toEqual({
			objectIds: ["rec-1"],
			part: textSlotPartSelection("rows"),
		});
	});

	it("switches the pick to another slot of the same object", () => {
		expect(
			selectTextSlot(
				selectionOf(["rec-1"], textSlotPartSelection("name")),
				record,
				"rows",
			),
		).toEqual({ objectIds: ["rec-1"], part: textSlotPartSelection("rows") });
	});

	it("hands the selection over unchanged when it already names that slot", () => {
		const selection = selectionOf(["rec-1"], textSlotPartSelection("rows"));
		expect(selectTextSlot(selection, record, "rows")).toBe(selection);
	});

	it("keeps the id list reference while only the pick moves", () => {
		const selection = selectionOf(["rec-1"], textSlotPartSelection("name"));
		expect(selectTextSlot(selection, record, "rows").objectIds).toBe(
			selection.objectIds,
		);
	});

	it("picks the body slot of a type holding one body", () => {
		expect(selectTextSlot(selectionOf([]), rect, "body")).toEqual({
			objectIds: ["rect-1"],
			part: textSlotPartSelection("body"),
		});
	});

	it("replaces a pick of another kind left on the same object", () => {
		const selection = selectionOf(["rect-1"], vertexPartSelection(0));
		const next = selectTextSlot(selection, rect, "body");
		expect(next).toEqual({
			objectIds: ["rect-1"],
			part: textSlotPartSelection("body"),
		});
		expect(next.objectIds).toBe(selection.objectIds);
	});

	it("picks the body when a one-body object is the whole selection with nothing picked", () => {
		expect(selectTextSlot(selectionOf(["rect-1"]), rect, "body")).toEqual({
			objectIds: ["rect-1"],
			part: textSlotPartSelection("body"),
		});
	});

	it("hands over unchanged when a one-body object's body is already picked", () => {
		const selection = selectionOf(["rect-1"], textSlotPartSelection("body"));
		expect(selectTextSlot(selection, rect, "body")).toBe(selection);
	});
});

import { describe, expect, it } from "vitest";

import { createTextSlotPartKindDefinition } from "../createTextSlotPartKindDefinition";
import { createObjectPartKindRegistry } from "../ObjectPartKindRegistry";
import { selectTextSlot } from "../selectTextSlot";
import { selectionOf } from "./support/selectionOf";
import { textSlotPartSelection } from "./support/textSlotPartSelection";
import { vertexPartSelection } from "./support/vertexPartSelection";
import type { ObjectState } from "../../../states/objects/base/ObjectState";

/** A record-like shape, the one type here that takes a slot pick. */
const record: ObjectState = {
	id: "rec-1",
	type: "record",
	features: { text: "slots" },
	text: { name: { text: "User" }, rows: { text: ["id"] } },
} as unknown as ObjectState;

/** A shape holding one body, which is no part of its own. */
const rect: ObjectState = {
	id: "rect-1",
	type: "rect",
	features: { text: "body" },
	text: { body: { text: "hi" } },
} as unknown as ObjectState;

const objectPartKind = createObjectPartKindRegistry();
objectPartKind.register("record", [
	createTextSlotPartKindDefinition(undefined),
]);

describe("selectTextSlot", () => {
	it("picks the slot on a type that takes slot picks", () => {
		expect(
			selectTextSlot(selectionOf([]), record, "rows", objectPartKind),
		).toEqual({
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
				objectPartKind,
			),
		).toEqual({ objectIds: ["rec-1"], part: textSlotPartSelection("rows") });
	});

	it("hands the selection over unchanged when it already names that slot", () => {
		const selection = selectionOf(["rec-1"], textSlotPartSelection("rows"));
		expect(selectTextSlot(selection, record, "rows", objectPartKind)).toBe(
			selection,
		);
	});

	it("keeps the id list reference while only the pick moves", () => {
		const selection = selectionOf(["rec-1"], textSlotPartSelection("name"));
		expect(
			selectTextSlot(selection, record, "rows", objectPartKind).objectIds,
		).toBe(selection.objectIds);
	});

	it("picks nothing below a type holding one body", () => {
		expect(
			selectTextSlot(selectionOf([]), rect, "body", objectPartKind),
		).toEqual({ objectIds: ["rect-1"], part: null });
	});

	it("drops a pick of another kind left on the same object", () => {
		expect(
			selectTextSlot(
				selectionOf(["rect-1"], vertexPartSelection(0)),
				rect,
				"body",
				objectPartKind,
			),
		).toEqual({ objectIds: ["rect-1"], part: null });
	});

	it("hands over unchanged when a one-body object is already the whole selection", () => {
		const selection = selectionOf(["rect-1"]);
		expect(selectTextSlot(selection, rect, "body", objectPartKind)).toBe(
			selection,
		);
	});
});

import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTextSlotPartKindDefinition } from "../createTextSlotPartKindDefinition";
import { createObjectPartKindRegistry } from "../ObjectPartKindRegistry";
import type { ObjectPartSelection } from "../ObjectPartSelection";
import { reconcileObjectPartSelection } from "../reconcileObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../textSlotPartKind";

/** A record-like shape: multiple text slots, declared via features.text = "slots". */
const slotShape = (id: string): ObjectState =>
	({
		id,
		type: "record",
		features: { text: "slots" },
		text: { name: { text: "User" }, rows: { text: ["id: string"] } },
	}) as unknown as ObjectState;

/**
 * The registry every case here reconciles against: "record" takes part the way
 * applyObjectDefinition makes every `features.text === "slots"` type take part,
 * and nothing else does.
 */
const objectPartKind = createObjectPartKindRegistry();
objectPartKind.register("record", [createTextSlotPartKindDefinition()]);

const makeState = (
	objects: Record<string, ObjectState>,
	selectedIds: string[],
	objectPartSelection: ObjectPartSelection | null,
): CanvasControllerState =>
	({
		objects,
		selectedIds,
		objectPartSelection,
	}) as unknown as CanvasControllerState;

/** The single-slot part selection most cases here are built from. */
const textSlot = (objectId: string, slotId: string): ObjectPartSelection => ({
	objectId,
	kind: TEXT_SLOT_PART_KIND,
	ranges: [{ anchorId: slotId, focusId: slotId }],
});

describe("reconcileObjectPartSelection", () => {
	it("returns the state itself (same reference) when the selection is valid", () => {
		const state = makeState(
			{ "rec-1": slotShape("rec-1") },
			["rec-1"],
			textSlot("rec-1", "rows"),
		);
		expect(reconcileObjectPartSelection(state, objectPartKind)).toBe(state);
	});

	it("returns the state itself when nothing is part-selected", () => {
		const state = makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], null);
		expect(reconcileObjectPartSelection(state, objectPartKind)).toBe(state);
	});

	it("clears the selection once it covers more than its own object", () => {
		const objects = {
			"rec-1": slotShape("rec-1"),
			"rec-2": slotShape("rec-2"),
		};
		const slot = textSlot("rec-1", "name");
		expect(
			reconcileObjectPartSelection(
				makeState(objects, ["rec-1", "rec-2"], slot),
				objectPartKind,
			).objectPartSelection,
		).toBeNull();
		expect(
			reconcileObjectPartSelection(makeState(objects, [], slot), objectPartKind)
				.objectPartSelection,
		).toBeNull();
	});

	it("clears the selection when it moved to another object", () => {
		const objects = {
			"rec-1": slotShape("rec-1"),
			"rec-2": slotShape("rec-2"),
		};
		const state = makeState(objects, ["rec-2"], textSlot("rec-1", "name"));
		expect(
			reconcileObjectPartSelection(state, objectPartKind).objectPartSelection,
		).toBeNull();
	});

	it("clears the selection when the object is gone", () => {
		const state = makeState({}, ["rec-1"], textSlot("rec-1", "name"));
		expect(
			reconcileObjectPartSelection(state, objectPartKind).objectPartSelection,
		).toBeNull();
	});

	it("clears the selection when the object's type registers no such kind", () => {
		const singleSlotRect = {
			id: "rect-1",
			type: "rect",
			features: { text: "body" },
			text: { body: { text: "hello" } },
		} as unknown as ObjectState;
		const state = makeState(
			{ "rect-1": singleSlotRect },
			["rect-1"],
			textSlot("rect-1", "body"),
		);
		expect(
			reconcileObjectPartSelection(state, objectPartKind).objectPartSelection,
		).toBeNull();
	});

	it("clears the selection when the slot no longer exists on the object", () => {
		const state = makeState(
			{ "rec-1": slotShape("rec-1") },
			["rec-1"],
			textSlot("rec-1", "operations"),
		);
		expect(
			reconcileObjectPartSelection(state, objectPartKind).objectPartSelection,
		).toBeNull();
	});

	it("clears a slot id that only names an Object.prototype member", () => {
		const state = makeState(
			{ "rec-1": slotShape("rec-1") },
			["rec-1"],
			textSlot("rec-1", "toString"),
		);
		expect(
			reconcileObjectPartSelection(state, objectPartKind).objectPartSelection,
		).toBeNull();
	});

	it("clears the selection when the object's text is not the keyed normal form", () => {
		const brokenShape = {
			id: "rec-1",
			type: "record",
			features: { text: "slots" },
			text: 123,
		} as unknown as ObjectState;
		const state = makeState(
			{ "rec-1": brokenShape },
			["rec-1"],
			textSlot("rec-1", "name"),
		);
		expect(
			reconcileObjectPartSelection(state, objectPartKind).objectPartSelection,
		).toBeNull();
	});

	it("clears the whole selection when one range has a dead end, rather than narrowing it", () => {
		const state = makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], {
			objectId: "rec-1",
			kind: TEXT_SLOT_PART_KIND,
			ranges: [
				{ anchorId: "name", focusId: "rows" },
				{ anchorId: "name", focusId: "operations" },
			],
		});
		expect(
			reconcileObjectPartSelection(state, objectPartKind).objectPartSelection,
		).toBeNull();
	});

	it("returns the state itself when every range survived", () => {
		const state = makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], {
			objectId: "rec-1",
			kind: TEXT_SLOT_PART_KIND,
			ranges: [
				{ anchorId: "name", focusId: "name" },
				{ anchorId: "rows", focusId: "name" },
			],
		});
		expect(reconcileObjectPartSelection(state, objectPartKind)).toBe(state);
	});
});

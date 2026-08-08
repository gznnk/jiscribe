import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { resolveSelectedTextSlot } from "../resolveSelectedTextSlot";

/** A record-like shape: multiple text slots, declared via features.text = "slots". */
const slotShape = (id: string): ObjectState =>
	({
		id,
		type: "record",
		features: { text: "slots" },
		text: { name: { text: "User" }, rows: { text: ["id: string"] } },
	}) as unknown as ObjectState;

const makeState = (
	objects: Record<string, ObjectState>,
	selectedIds: string[],
	selectedTextSlot: CanvasControllerState["selectedTextSlot"],
): CanvasControllerState =>
	({
		objects,
		selectedIds,
		selectedTextSlot,
	}) as unknown as CanvasControllerState;

describe("resolveSelectedTextSlot", () => {
	it("returns the slot selection itself (same reference) when it is valid", () => {
		const selectedTextSlot = { objectId: "rec-1", slotId: "rows" };
		const state = makeState(
			{ "rec-1": slotShape("rec-1") },
			["rec-1"],
			selectedTextSlot,
		);
		expect(resolveSelectedTextSlot(state)).toBe(selectedTextSlot);
	});

	it("returns null when nothing is slot-selected", () => {
		const state = makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], null);
		expect(resolveSelectedTextSlot(state)).toBeNull();
	});

	it("returns null once the selection covers more than the slot's object", () => {
		const objects = {
			"rec-1": slotShape("rec-1"),
			"rec-2": slotShape("rec-2"),
		};
		const slot = { objectId: "rec-1", slotId: "name" };
		expect(
			resolveSelectedTextSlot(makeState(objects, ["rec-1", "rec-2"], slot)),
		).toBeNull();
		expect(resolveSelectedTextSlot(makeState(objects, [], slot))).toBeNull();
	});

	it("returns null when the selection moved to another object", () => {
		const objects = {
			"rec-1": slotShape("rec-1"),
			"rec-2": slotShape("rec-2"),
		};
		const state = makeState(objects, ["rec-2"], {
			objectId: "rec-1",
			slotId: "name",
		});
		expect(resolveSelectedTextSlot(state)).toBeNull();
	});

	it("returns null when the object is gone", () => {
		const state = makeState({}, ["rec-1"], {
			objectId: "rec-1",
			slotId: "name",
		});
		expect(resolveSelectedTextSlot(state)).toBeNull();
	});

	it("returns null for a shape that does not declare slot text", () => {
		const singleSlotRect = {
			id: "rect-1",
			type: "rect",
			features: { text: "body" },
			text: { body: { text: "hello" } },
		} as unknown as ObjectState;
		const state = makeState({ "rect-1": singleSlotRect }, ["rect-1"], {
			objectId: "rect-1",
			slotId: "body",
		});
		expect(resolveSelectedTextSlot(state)).toBeNull();
	});

	it("returns null when the slot no longer exists on the object", () => {
		const state = makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], {
			objectId: "rec-1",
			slotId: "operations",
		});
		expect(resolveSelectedTextSlot(state)).toBeNull();
	});

	it("returns null for a slot id that only names an Object.prototype member", () => {
		const state = makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], {
			objectId: "rec-1",
			slotId: "toString",
		});
		expect(resolveSelectedTextSlot(state)).toBeNull();
	});

	it("returns null when the object's text is not the keyed normal form", () => {
		const brokenShape = {
			id: "rec-1",
			type: "record",
			features: { text: "slots" },
			text: 123,
		} as unknown as ObjectState;
		const state = makeState({ "rec-1": brokenShape }, ["rec-1"], {
			objectId: "rec-1",
			slotId: "name",
		});
		expect(resolveSelectedTextSlot(state)).toBeNull();
	});
});

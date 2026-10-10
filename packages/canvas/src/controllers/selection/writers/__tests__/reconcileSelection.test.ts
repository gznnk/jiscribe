import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { selectionOf } from "../../__tests__/support/selectionOf";
import { vertexPartSelection } from "../../__tests__/support/vertexPartSelection";
import type { ObjectPartSelection } from "../../CanvasSelection";
import {
	createObjectPartKindRegistry,
	type ObjectPartKindDefinition,
} from "../../partKinds/ObjectPartKindRegistry";
import {
	createTextSlotPartKindDefinition,
	TEXT_SLOT_PART_KIND,
} from "../../partKinds/textSlotPartKind";
import { createVertexPartKindDefinition } from "../../partKinds/vertexPartKind";
import { reconcileSelection } from "../reconcileSelection";

/** A record-like shape: multiple text slots, declared via features.text = "slots". */
const slotShape = (id: string): ObjectState =>
	({
		id,
		type: "record",
		features: { text: "slots" },
		text: { name: { text: "User" }, rows: { text: ["id: string"] } },
	}) as unknown as ObjectState;

/** A shape holding one body: it declares no part kind, so it picks nothing below itself. */
const singleBodyShape = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		features: { text: "body" },
		text: { body: { text: "hello" } },
	}) as unknown as ObjectState;

/**
 * A slot type picking something else of its own as well: the one way
 * `selection.part` can be live and still name no slot to write a draft back to.
 */
const cellShape = (id: string): ObjectState =>
	({
		id,
		type: "table",
		features: { text: "slots" },
		text: { a1: { text: "x" } },
	}) as unknown as ObjectState;

/** The second kind "table" declares, every id of which it holds. */
const cellPartKind: ObjectPartKindDefinition = {
	kind: "cell",
	has: () => true,
};

/** A single-cell pick, the shape of a part of the kind that is no slot. */
const cellPart: ObjectPartSelection = {
	kind: cellPartKind.kind,
	ranges: [{ anchorId: "a1", focusId: "a1" }],
};

/** A connector carrying two waypoints, the parts of its `vertex` kind. */
const connector = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		points: [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
		],
	}) as unknown as ObjectState;

/**
 * The registry every case here reconciles against: "record" takes part the way
 * applyObjectDefinition makes every `features.text === "slots"` type take part,
 * "table" takes both that and cells of its own, "connector" declares its
 * waypoints, and nothing else takes part at all.
 */
const objectPartKind = createObjectPartKindRegistry();
objectPartKind.register("record", [
	createTextSlotPartKindDefinition(undefined),
]);
objectPartKind.register("table", [
	createTextSlotPartKindDefinition(undefined),
	cellPartKind,
]);
objectPartKind.register("connector", [createVertexPartKindDefinition(2)]);

const makeState = (
	objects: Record<string, ObjectState>,
	selectedIds: string[],
	part: ObjectPartSelection | null,
): CanvasControllerState =>
	({
		objects,
		selection: selectionOf(selectedIds, part),
	}) as unknown as CanvasControllerState;

/** The same state with an editing session open over whatever it has selected. */
const editing = (
	state: CanvasControllerState,
	textEditState: CanvasControllerState["textEditState"],
): CanvasControllerState => ({ ...state, textEditState });

/** The single-slot part selection most cases here are built from. */
const textSlot = (slotId: string): ObjectPartSelection => ({
	kind: TEXT_SLOT_PART_KIND,
	ranges: [{ anchorId: slotId, focusId: slotId }],
});

describe("reconcileSelection", () => {
	it("returns the state itself (same reference) when the selection is valid", () => {
		const state = makeState(
			{ "rec-1": slotShape("rec-1") },
			["rec-1"],
			textSlot("rows"),
		);
		expect(reconcileSelection(state, objectPartKind)).toBe(state);
	});

	it("returns the state itself when nothing is part-selected", () => {
		const state = makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], null);
		expect(reconcileSelection(state, objectPartKind)).toBe(state);
	});

	it("clears the selection once it covers more than its own object", () => {
		const objects = {
			"rec-1": slotShape("rec-1"),
			"rec-2": slotShape("rec-2"),
		};
		const slot = textSlot("name");
		expect(
			reconcileSelection(
				makeState(objects, ["rec-1", "rec-2"], slot),
				objectPartKind,
			).selection.part,
		).toBeNull();
		expect(
			reconcileSelection(makeState(objects, [], slot), objectPartKind).selection
				.part,
		).toBeNull();
	});

	it("clears the selection when the object is gone", () => {
		const state = makeState({}, ["rec-1"], textSlot("name"));
		expect(reconcileSelection(state, objectPartKind).selection.part).toBeNull();
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
			textSlot("body"),
		);
		expect(reconcileSelection(state, objectPartKind).selection.part).toBeNull();
	});

	it("clears the selection when the slot no longer exists on the object", () => {
		const state = makeState(
			{ "rec-1": slotShape("rec-1") },
			["rec-1"],
			textSlot("operations"),
		);
		expect(reconcileSelection(state, objectPartKind).selection.part).toBeNull();
	});

	it("clears a slot id that only names an Object.prototype member", () => {
		const state = makeState(
			{ "rec-1": slotShape("rec-1") },
			["rec-1"],
			textSlot("toString"),
		);
		expect(reconcileSelection(state, objectPartKind).selection.part).toBeNull();
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
			textSlot("name"),
		);
		expect(reconcileSelection(state, objectPartKind).selection.part).toBeNull();
	});

	it("clears the whole selection when one range has a dead end, rather than narrowing it", () => {
		const state = makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], {
			kind: TEXT_SLOT_PART_KIND,
			ranges: [
				{ anchorId: "name", focusId: "rows" },
				{ anchorId: "name", focusId: "operations" },
			],
		});
		expect(reconcileSelection(state, objectPartKind).selection.part).toBeNull();
	});

	it("keeps a vertex picked on the selected connector", () => {
		const state = makeState(
			{ "c-1": connector("c-1") },
			["c-1"],
			vertexPartSelection(1),
		);
		expect(reconcileSelection(state, objectPartKind)).toBe(state);
	});

	it("clears a vertex picked on a connector another object has since replaced", () => {
		const objects = { "c-1": connector("c-1"), "rec-1": slotShape("rec-1") };
		const pick = vertexPartSelection(1);
		expect(
			reconcileSelection(makeState(objects, ["rec-1"], pick), objectPartKind)
				.selection.part,
		).toBeNull();
		expect(
			reconcileSelection(makeState(objects, ["c-2"], pick), objectPartKind)
				.selection.part,
		).toBeNull();
	});

	it("clears a vertex the connector has outgrown", () => {
		const state = makeState(
			{ "c-1": connector("c-1") },
			["c-1"],
			vertexPartSelection(7),
		);
		expect(reconcileSelection(state, objectPartKind).selection.part).toBeNull();
	});

	it("returns the state itself when every range survived", () => {
		const state = makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], {
			kind: TEXT_SLOT_PART_KIND,
			ranges: [
				{ anchorId: "name", focusId: "name" },
				{ anchorId: "rows", focusId: "name" },
			],
		});
		expect(reconcileSelection(state, objectPartKind)).toBe(state);
	});

	/**
	 * The other half of what hangs off the selection. Every case here is a state
	 * `resolveTextEdit` would throw on, so what this proves is that no state the
	 * reducer hands on can reach it.
	 */
	describe("an open text edit", () => {
		it("survives while the slot it is on does", () => {
			const state = editing(
				makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], textSlot("name")),
				{ kind: "shape", text: "edited" },
			);
			expect(reconcileSelection(state, objectPartKind)).toBe(state);
		});

		it("survives on a one-body shape, which picks nothing below itself", () => {
			const state = editing(
				makeState({ "rect-1": singleBodyShape("rect-1") }, ["rect-1"], null),
				{ kind: "shape", text: "edited" },
			);
			expect(reconcileSelection(state, objectPartKind)).toBe(state);
		});

		it("is discarded on a slot type that picks nothing, which names no slot", () => {
			const state = editing(
				makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], null),
				{ kind: "shape", text: "edited" },
			);
			expect(
				reconcileSelection(state, objectPartKind).textEditState,
			).toBeNull();
		});

		it("is discarded on a slot type whose live pick is of another kind", () => {
			const state = editing(
				makeState({ "tbl-1": cellShape("tbl-1") }, ["tbl-1"], cellPart),
				{ kind: "shape", text: "edited" },
			);
			const after = reconcileSelection(state, objectPartKind);
			// The pick itself is live, so it stays; only the session goes.
			expect(after.selection.part).toBe(cellPart);
			expect(after.textEditState).toBeNull();
		});

		it("is discarded along with the slot it was being written to", () => {
			const state = editing(
				makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], textSlot("gone")),
				{ kind: "shape", text: "edited" },
			);
			const after = reconcileSelection(state, objectPartKind);
			expect(after.selection.part).toBeNull();
			expect(after.textEditState).toBeNull();
		});

		it("is discarded when a one-body shape's owner is gone, with no part to catch it", () => {
			const state = editing(makeState({}, ["rect-1"], null), {
				kind: "shape",
				text: "edited",
			});
			expect(
				reconcileSelection(state, objectPartKind).textEditState,
			).toBeNull();
		});

		it("is discarded when the object it is on stopped holding text", () => {
			const state = editing(
				makeState({ "c-1": connector("c-1") }, ["c-1"], null),
				{ kind: "shape", text: "edited" },
			);
			expect(
				reconcileSelection(state, objectPartKind).textEditState,
			).toBeNull();
		});

		it("is discarded when the selection grew past one object", () => {
			const state = editing(
				makeState(
					{ "rec-1": slotShape("rec-1"), "c-1": connector("c-1") },
					["rec-1", "c-1"],
					null,
				),
				{ kind: "shape", text: "edited" },
			);
			expect(
				reconcileSelection(state, objectPartKind).textEditState,
			).toBeNull();
		});

		it("keeps a connector label while its connector is the selection", () => {
			const state = editing(
				makeState({ "c-1": connector("c-1") }, ["c-1"], null),
				{ kind: "connectorLabel", text: "Yes" },
			);
			expect(reconcileSelection(state, objectPartKind)).toBe(state);
		});

		it("discards a connector label once its connector is gone", () => {
			const state = editing(makeState({}, ["c-1"], null), {
				kind: "connectorLabel",
				text: "Yes",
			});
			expect(
				reconcileSelection(state, objectPartKind).textEditState,
			).toBeNull();
		});

		it("discards a connector label whose object is no connector any more", () => {
			const state = editing(
				makeState({ "rec-1": slotShape("rec-1") }, ["rec-1"], null),
				{ kind: "connectorLabel", text: "Yes" },
			);
			expect(
				reconcileSelection(state, objectPartKind).textEditState,
			).toBeNull();
		});

		it("keeps a connector label when a part is dropped, it sitting on none", () => {
			const state = editing(
				makeState({ "c-1": connector("c-1") }, ["c-1"], vertexPartSelection(7)),
				{ kind: "connectorLabel", text: "Yes" },
			);
			const after = reconcileSelection(state, objectPartKind);
			expect(after.selection.part).toBeNull();
			expect(after.textEditState).toBe(state.textEditState);
		});
	});
});

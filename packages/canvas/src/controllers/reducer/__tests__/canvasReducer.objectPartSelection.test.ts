import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import { createTestState } from "./support/createTestState";
import { rectDoc, twoRectsDoc } from "./support/fixtures";
import { canvasToState } from "../../../states/canvas/CanvasMapper";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import { selectionOf } from "../../selection/__tests__/support/selectionOf";
import { createTextSlotPartKindDefinition } from "../../selection/createTextSlotPartKindDefinition";
import type { ObjectPartSelection } from "../../selection/ObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../selection/textSlotPartKind";
import type { CanvasAction } from "../CanvasActions";
import { createCanvasReducer } from "../canvasReducer";

const registries = createTestRegistries();
// No built-in type spells its text out as slots, so "rect" is handed the kind
// applyObjectDefinition would have given such a type.
registries.objectPartKind.register("rect", [
	createTextSlotPartKindDefinition(undefined),
]);

const canvasReducer = createCanvasReducer(registries);

// rect-1 is given one named slot, which is what a part selection needs to name.
const baseObjects = createTestState(twoRectsDoc).objects;
const slotObjects: Record<string, ObjectState> = {
	...baseObjects,
	"rect-1": {
		...baseObjects["rect-1"],
		text: { body: { text: "hi" } },
	} as unknown as ObjectState,
};

const createState = (
	overrides?: Partial<CanvasControllerState>,
): CanvasControllerState =>
	createTestState(twoRectsDoc, { objects: slotObjects, ...overrides });

const bodySlotSelection: ObjectPartSelection = {
	kind: TEXT_SLOT_PART_KIND,
	ranges: [{ anchorId: "body", focusId: "body" }],
};

const nudgeSelection: CanvasAction = {
	type: "COMMAND",
	commandId: "move-right",
};

const deleteSelection: CanvasAction = { type: "COMMAND", commandId: "delete" };

// A document the part selection's object is not in, used as both the external
// edit and the swapped-in file.
const rectTwoOnlyDoc: CanvasDoc = {
	version: 1,
	root: [rectDoc("rect-2", 100, 100)],
} as unknown as CanvasDoc;

const adoptDoc = (
	type: "SYNC_EXTERNAL" | "LOAD_DOCUMENT",
	doc: CanvasDoc,
): CanvasAction => ({
	type,
	payload: canvasToState(
		doc,
		registries.objectMapper,
		registries.objectContentResizer,
	),
});

describe("canvasReducer / selection.part reconciliation", () => {
	it("keeps a part selection the state still backs, by the same reference", () => {
		const state = createState({
			selection: selectionOf(["rect-1"], bodySlotSelection),
		});

		expect(canvasReducer(state, nudgeSelection).selection.part).toBe(
			bodySlotSelection,
		);
	});

	it("drops one whose object SET_SELECTION no longer leaves as the sole selection", () => {
		const state = createState({
			selection: selectionOf(["rect-1"], bodySlotSelection),
		});

		const next = canvasReducer(state, {
			type: "SET_SELECTION",
			ids: ["rect-1", "rect-2"],
		});

		expect(next.selection.objectIds).toEqual(["rect-1", "rect-2"]);
		expect(next.selection.part).toBeNull();
	});

	it("drops one when the command that ran deleted its object", () => {
		const state = createState({
			selection: selectionOf(["rect-1"], bodySlotSelection),
		});

		const next = canvasReducer(state, deleteSelection);

		expect(next.objects["rect-1"]).toBeUndefined();
		expect(next.selection.part).toBeNull();
	});

	it("leaves none behind across a revert", () => {
		// The restore resets the transient channels itself; what this pins is that
		// nothing addressed below the object survives into the restored document.
		const state = createState({
			selection: selectionOf(["rect-1"], bodySlotSelection),
		});

		const nudged = canvasReducer(state, nudgeSelection);
		expect(nudged.selection.part).toBe(bodySlotSelection);

		const reverted = canvasReducer(nudged, {
			type: "REVERT_HISTORY",
			entry: nudged.history.past[0],
		});

		expect(reverted.selection.part).toBeNull();
	});

	it("drops one whose object the externally synced document no longer holds", () => {
		const state = createState({
			selection: selectionOf(["rect-1"], bodySlotSelection),
		});

		const next = canvasReducer(
			state,
			adoptDoc("SYNC_EXTERNAL", rectTwoOnlyDoc),
		);

		expect(next.objects["rect-1"]).toBeUndefined();
		expect(next.selection.part).toBeNull();
	});

	it("drops one whose object the loaded document no longer holds", () => {
		const state = createState({
			selection: selectionOf(["rect-1"], bodySlotSelection),
		});

		const next = canvasReducer(
			state,
			adoptDoc("LOAD_DOCUMENT", rectTwoOnlyDoc),
		);

		expect(next.objects["rect-1"]).toBeUndefined();
		expect(next.selection.part).toBeNull();
	});
});

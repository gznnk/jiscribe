import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { describe, expect, it } from "vitest";

import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import { textSlotPartSelection } from "../../../selection/__tests__/support/textSlotPartSelection";
import { createTextSlotPartKindDefinition } from "../../../selection/createTextSlotPartKindDefinition";
import type { ObjectPartSelection } from "../../../selection/ObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../selection/textSlotPartKind";
import { DEFAULT_LABEL_PLACEMENT } from "../../../utils/applyLabelPlacement";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import { StartTextEditCommand } from "../StartTextEditCommand";

const registries = createTestRegistries();
// "record" below stands in for a plugin type, so the built-in bundle does not
// carry it: register the textSlot kind applyObjectDefinition would give it.
registries.objectPartKind.register("record", [
	createTextSlotPartKindDefinition(undefined),
]);

const rect = {
	id: "rect-1",
	type: "rect",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
};

const svg = {
	id: "svg-1",
	type: "svg",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	svgText: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
};

/** Connector carrying the placement of a label that no longer has text. */
const connectorWithStalePlacement = {
	id: "connector-1",
	type: "connector",
	points: [
		{ x: 0, y: 0 },
		{ x: 100, y: 0 },
	],
	label: { text: "", position: 0.9, offset: 12, fontColor: "#f00" },
};

const doc = {
	version: 1,
	root: [rect, svg, connectorWithStalePlacement],
} as unknown as CanvasDoc;

const stateWithSelection = (selectedId: string) =>
	deepFreezeState({
		...createInitialControllerState(doc, registries),
		selection: selectionOf([selectedId]),
	});

const stateWithConnectorSelected = (connectorId: string) =>
	deepFreezeState({
		...createInitialControllerState(doc, registries),
		selection: selectionOf([connectorId]),
	});

describe("StartTextEditCommand", () => {
	it("a rect that supports text can start editing on its one body", () => {
		const state = stateWithSelection("rect-1");
		expect(StartTextEditCommand.canExecute?.(state, registries)).toBe(true);
		const after = StartTextEditCommand.execute(state, registries);
		expect(after.textEditState).toMatchObject({ kind: "shape" });
		// A rect holds one body rather than slots, so there is no part to pick.
		expect(after.selection).toBe(state.selection);
	});

	it("creating a connector label from Enter takes the default placement, not what a deleted label left", () => {
		const state = stateWithConnectorSelected("connector-1");
		expect(StartTextEditCommand.canExecute?.(state, registries)).toBe(true);

		const after = StartTextEditCommand.execute(state, registries);
		const { textEditState } = after;
		expect(textEditState).toMatchObject({
			kind: "connectorLabel",
			text: "",
			placement: DEFAULT_LABEL_PLACEMENT,
		});
		// The connector itself owns the session, with nothing picked below it.
		expect(after.selection).toEqual({
			objectIds: ["connector-1"],
			part: null,
		});

		// The placement rides through the commit, so the revived label sits at the
		// midpoint (both keys dropped) rather than the stale 0.9 / 12.
		const committed = commitTextEditIfNeeded({
			...state,
			textEditState: { ...textEditState, text: "Hi" },
		} as typeof state);
		expect(
			(committed.objects["connector-1"] as { label?: object }).label,
		).toEqual({ text: "Hi", fontColor: "#f00" });
	});

	it("re-editing a connector label carries no placement, so its own position stays", () => {
		const base = stateWithConnectorSelected("connector-1");
		const state = deepFreezeState({
			...base,
			objects: {
				...base.objects,
				"connector-1": {
					...base.objects["connector-1"],
					label: { text: "Yes", position: 0.9, offset: 12 },
				},
			},
		} as typeof base);

		expect(
			StartTextEditCommand.execute(state, registries).textEditState,
		).not.toHaveProperty("placement");
	});

	describe("a shape with slots", () => {
		/** A record standing in: no built-in type declares `features.text = "slots"`. */
		const stateWithSlotSelection = (part: ObjectPartSelection | null) =>
			deepFreezeState({
				...createInitialControllerState(doc, registries),
				objects: {
					"rec-1": {
						id: "rec-1",
						type: "record",
						features: { text: "slots" },
						text: { name: { text: "User" }, rows: { text: ["id: string"] } },
					},
				} as never,
				selection: selectionOf(["rec-1"], part),
			});

		it("edits the selected slot", () => {
			const state = stateWithSlotSelection({
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "rows", focusId: "rows" }],
			});
			const after = StartTextEditCommand.execute(state, registries);
			expect(after.textEditState).toMatchObject({
				kind: "shape",
				text: "id: string",
			});
			// Already that slot, so the selection is handed over unchanged.
			expect(after.selection).toBe(state.selection);
		});

		it("edits the first slot when no slot is selected, and selects it", () => {
			const state = stateWithSlotSelection(null);
			const after = StartTextEditCommand.execute(state, registries);
			expect(after.textEditState).toMatchObject({
				kind: "shape",
				text: "User",
			});
			expect(after.selection).toEqual({
				objectIds: ["rec-1"],
				part: textSlotPartSelection("name"),
			});
		});

		it("closes an open ObjectMenu submenu, which the edit session re-lays out", () => {
			const state = deepFreezeState({
				...stateWithSlotSelection({
					kind: TEXT_SLOT_PART_KIND,
					ranges: [{ anchorId: "rows", focusId: "rows" }],
				}),
				objectMenuOpenId: "alignment",
			});
			expect(
				StartTextEditCommand.execute(state, registries).objectMenuOpenId,
			).toBeNull();
		});
	});

	it("an svg that does not support text does not start editing", () => {
		const state = stateWithSelection("svg-1");
		expect(StartTextEditCommand.canExecute?.(state, registries)).toBe(false);
		// returns the state unchanged when editing is not entered
		expect(StartTextEditCommand.execute(state, registries)).toBe(state);
	});
});

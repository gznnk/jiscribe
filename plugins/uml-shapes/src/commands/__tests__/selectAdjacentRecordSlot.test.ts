import { createCanvasRegistries } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type {
	CanvasControllerState,
	ICanvasRegistries,
} from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { umlPlugin } from "../../plugin";
import { recordToState } from "../../state/RecordMapper";
import type { RecordState } from "../../state/RecordState";
import {
	canSelectAdjacentRecordSlot,
	extendRecordSlotSelection,
	selectAdjacentRecordSlot,
} from "../selectAdjacentRecordSlot";

/** A record holding every slot, so a step can start from one with a neighbour above and below. */
const FULL_RECORD = {
	id: "record-1",
	type: "record",
	text: {
		stereotype: { text: "interface" },
		name: { text: "User" },
		attributes: { text: ["id: string"] },
		operations: { text: ["save()"] },
	},
} as unknown as RecordState;

/** A record with no stereotype and no attributes, so the step has slots to skip. */
const SPARSE_RECORD = {
	id: "record-2",
	type: "record",
	text: {
		name: { text: "Repository" },
		operations: { text: ["find()"] },
	},
} as unknown as RecordState;

/** Only the fields the step reads; the rest of the controller state has no bearing on it. */
const canvasWith = (
	part: CanvasControllerState["selection"]["part"],
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: {
			[FULL_RECORD.id]: FULL_RECORD,
			[SPARSE_RECORD.id]: SPARSE_RECORD,
			"rect-1": { id: "rect-1", type: "rect" },
		},
		selection: { objectIds: [FULL_RECORD.id], part },
		mode: { kind: "normal" },
		drag: null,
		objectMenuOpenId: FULL_RECORD.id,
		...overrides,
	}) as unknown as CanvasControllerState;

/** A pick of whole slots, one collapsed range each — what a compartment click writes. */
const slotSelection = (slotIds: string[]) => ({
	kind: TEXT_SLOT_PART_KIND,
	ranges: slotIds.map((slotId) => ({ anchorId: slotId, focusId: slotId })),
});

/** A pick of whole slots on the record that lacks the stereotype and attributes. */
const sparseCanvasWith = (slotIds: string[]): CanvasControllerState =>
	canvasWith(null, {
		selection: {
			objectIds: [SPARSE_RECORD.id],
			part: slotSelection(slotIds),
		},
	});

/** The slot ranges the step left picked. */
const rangesAfter = (
	state: CanvasControllerState,
	direction: Parameters<typeof selectAdjacentRecordSlot>[1],
) => selectAdjacentRecordSlot(state, direction).selection.part?.ranges;

/** One collapsed range on `slotId`, the pick a step leaves behind. */
const collapsed = (slotId: string) => [{ anchorId: slotId, focusId: slotId }];

describe("selectAdjacentRecordSlot", () => {
	it("moves a single picked slot to the compartment above and below", () => {
		const state = canvasWith(slotSelection(["name"]));

		expect(rangesAfter(state, "up")).toEqual(collapsed("stereotype"));
		expect(rangesAfter(state, "down")).toEqual(collapsed("attributes"));
	});

	it("keeps the part kind and closes an open ObjectMenu submenu", () => {
		const next = selectAdjacentRecordSlot(
			canvasWith(slotSelection(["name"])),
			"down",
		);

		expect(next.selection.part?.kind).toBe(TEXT_SLOT_PART_KIND);
		expect(next.selection.objectIds).toEqual([FULL_RECORD.id]);
		expect(next.objectMenuOpenId).toBeNull();
	});

	it("skips the compartments the record does not hold", () => {
		expect(rangesAfter(sparseCanvasWith(["name"]), "down")).toEqual(
			collapsed("operations"),
		);
		expect(rangesAfter(sparseCanvasWith(["operations"]), "up")).toEqual(
			collapsed("name"),
		);
	});

	it("hands back the input state at the top and bottom slot", () => {
		for (const [state, direction] of [
			[canvasWith(slotSelection(["stereotype"])), "up"],
			[canvasWith(slotSelection(["operations"])), "down"],
			[sparseCanvasWith(["name"]), "up"],
			[sparseCanvasWith(["operations"]), "down"],
		] as const) {
			expect(canSelectAdjacentRecordSlot(state)).toBe(true);
			expect(selectAdjacentRecordSlot(state, direction)).toBe(state);
		}
	});

	it("hands back the input state for left and right", () => {
		const state = canvasWith(slotSelection(["attributes"]));

		expect(canSelectAdjacentRecordSlot(state)).toBe(true);
		expect(selectAdjacentRecordSlot(state, "left")).toBe(state);
		expect(selectAdjacentRecordSlot(state, "right")).toBe(state);
	});

	it("collapses a range to the neighbour of its focus", () => {
		const state = canvasWith({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "stereotype", focusId: "attributes" }],
		});

		expect(rangesAfter(state, "down")).toEqual(collapsed("operations"));
		// The anchor's side of the range is not where the step starts from.
		expect(rangesAfter(state, "up")).toEqual(collapsed("name"));
	});

	it("collapses a range onto its focus at the edge", () => {
		const state = canvasWith({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "operations", focusId: "stereotype" }],
		});

		expect(rangesAfter(state, "up")).toEqual(collapsed("stereotype"));
	});

	it("leaves a range as it is for left and right", () => {
		const state = canvasWith({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "operations", focusId: "stereotype" }],
		});

		expect(selectAdjacentRecordSlot(state, "left")).toBe(state);
		expect(selectAdjacentRecordSlot(state, "right")).toBe(state);
	});

	it("steps from the focus of the last range of a Ctrl-built pick", () => {
		const state = canvasWith(slotSelection(["operations", "stereotype"]));

		expect(rangesAfter(state, "down")).toEqual(collapsed("name"));
	});
});

describe("extendRecordSlotSelection", () => {
	/** The slot ranges the extension left picked. */
	const extendedRangesAfter = (
		state: CanvasControllerState,
		direction: Parameters<typeof extendRecordSlotSelection>[1],
	) => extendRecordSlotSelection(state, direction).selection.part?.ranges;

	it("widens a single picked slot into a range anchored on it", () => {
		const state = canvasWith(slotSelection(["name"]));

		expect(extendedRangesAfter(state, "up")).toEqual([
			{ anchorId: "name", focusId: "stereotype" },
		]);
		expect(extendedRangesAfter(state, "down")).toEqual([
			{ anchorId: "name", focusId: "attributes" },
		]);
	});

	it("moves the focus away from the anchor and back towards it", () => {
		const state = canvasWith({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "stereotype", focusId: "name" }],
		});

		expect(extendedRangesAfter(state, "down")).toEqual([
			{ anchorId: "stereotype", focusId: "attributes" },
		]);
		expect(extendedRangesAfter(state, "up")).toEqual([
			{ anchorId: "stereotype", focusId: "stereotype" },
		]);
	});

	it("crosses the anchor, turning the range the other way", () => {
		const state = canvasWith(slotSelection(["name"]));
		const crossed = extendRecordSlotSelection(
			extendRecordSlotSelection(state, "down"),
			"up",
		);

		expect(extendedRangesAfter(crossed, "up")).toEqual([
			{ anchorId: "name", focusId: "stereotype" },
		]);
	});

	it("skips the compartments the record does not hold", () => {
		expect(extendedRangesAfter(sparseCanvasWith(["name"]), "down")).toEqual([
			{ anchorId: "name", focusId: "operations" },
		]);
	});

	it("keeps the part kind and closes an open ObjectMenu submenu", () => {
		const next = extendRecordSlotSelection(
			canvasWith(slotSelection(["name"])),
			"down",
		);

		expect(next.selection.part?.kind).toBe(TEXT_SLOT_PART_KIND);
		expect(next.selection.objectIds).toEqual([FULL_RECORD.id]);
		expect(next.objectMenuOpenId).toBeNull();
	});

	it("hands back the input state when the focus is at the top or bottom slot", () => {
		for (const [focusId, direction] of [
			["stereotype", "up"],
			["operations", "down"],
		] as const) {
			const state = canvasWith({
				kind: TEXT_SLOT_PART_KIND,
				ranges: [{ anchorId: "name", focusId }],
			});
			expect(canSelectAdjacentRecordSlot(state)).toBe(true);
			expect(extendRecordSlotSelection(state, direction)).toBe(state);
		}
	});

	it("hands back the input state for left and right", () => {
		const state = canvasWith(slotSelection(["attributes"]));

		expect(extendRecordSlotSelection(state, "left")).toBe(state);
		expect(extendRecordSlotSelection(state, "right")).toBe(state);
	});

	it("extends only the last range of a Ctrl-built pick, keeping the others", () => {
		const state = canvasWith({
			kind: TEXT_SLOT_PART_KIND,
			ranges: [
				{ anchorId: "stereotype", focusId: "name" },
				{ anchorId: "operations", focusId: "operations" },
			],
		});

		expect(extendedRangesAfter(state, "up")).toEqual([
			{ anchorId: "stereotype", focusId: "name" },
			{ anchorId: "operations", focusId: "attributes" },
		]);
	});

	it("leaves a record selected as a whole or a slot being edited alone", () => {
		for (const state of [
			canvasWith(null),
			canvasWith(slotSelection(["name"]), {
				mode: { kind: "textEdit" } as never,
			}),
		]) {
			expect(extendRecordSlotSelection(state, "down")).toBe(state);
		}
	});

	it("walks the same order the core's linear range runs along", () => {
		// A Shift-click range is the slice of Object.keys(state.text) between its
		// ends, so the step order must be that key order.
		const stackedKeys = Object.keys(
			recordToState({
				id: "r",
				type: "record",
				text: {
					operations: { text: ["find()"] },
					name: { text: "Repository" },
					stereotype: { text: "interface" },
				},
			} as never).text,
		);
		expect(stackedKeys).toEqual(["stereotype", "name", "operations"]);
	});
});

describe("canSelectAdjacentRecordSlot", () => {
	it("is true for a slot pick on the sole selected record", () => {
		expect(
			canSelectAdjacentRecordSlot(canvasWith(slotSelection(["name"]))),
		).toBe(true);
	});

	it("is false for every other context, leaving the keys to the nudge", () => {
		const contexts: Record<string, CanvasControllerState> = {
			"whole record": canvasWith(null),
			"text edit open": canvasWith(slotSelection(["name"]), {
				mode: { kind: "textEdit" } as never,
			}),
			"drag running": canvasWith(slotSelection(["name"]), {
				drag: {} as never,
			}),
			"another shape": canvasWith(null, {
				selection: { objectIds: ["rect-1"], part: null },
			}),
			"record with another shape": canvasWith(null, {
				selection: { objectIds: [FULL_RECORD.id, "rect-1"], part: null },
			}),
			"slot the record does not hold": canvasWith(null, {
				selection: {
					objectIds: [SPARSE_RECORD.id],
					part: slotSelection(["attributes"]),
				},
			}),
		};
		for (const [name, state] of Object.entries(contexts)) {
			expect({ name, can: canSelectAdjacentRecordSlot(state) }).toEqual({
				name,
				can: false,
			});
			expect(selectAdjacentRecordSlot(state, "down")).toBe(state);
		}
	});
});

describe("bare arrow routing with the UML plugin", () => {
	const registries = createCanvasRegistries({ plugins: [umlPlugin] });
	/** The same bundle as the narrow view a command's `canExecute` is handed. */
	const commandRegistries = registries as unknown as ICanvasRegistries;

	/** The command a bare arrow runs in `state`: the first match whose `canExecute` passes. */
	const arrowCommandId = (
		state: CanvasControllerState,
		code: "ArrowUp" | "ArrowLeft",
		shiftKey = false,
	): string | undefined =>
		registries.command
			.findAllByShortcut({
				code,
				key: code,
				ctrlKey: false,
				metaKey: false,
				shiftKey,
				altKey: false,
			} as KeyboardEvent)
			.find((command) => command.canExecute(state, commandRegistries))?.id;

	it("steps the slot pick instead of nudging the record", () => {
		expect(arrowCommandId(canvasWith(slotSelection(["name"])), "ArrowUp")).toBe(
			"record.selectSlotUp",
		);
		// At the top and sideways too, or the key would fall through and move the record.
		expect(
			arrowCommandId(canvasWith(slotSelection(["stereotype"])), "ArrowUp"),
		).toBe("record.selectSlotUp");
		expect(
			arrowCommandId(canvasWith(slotSelection(["name"])), "ArrowLeft"),
		).toBe("record.selectSlotLeft");
	});

	it("extends the slot pick with Shift instead of nudging the record further", () => {
		expect(
			arrowCommandId(canvasWith(slotSelection(["name"])), "ArrowUp", true),
		).toBe("record.extendSlotSelectionUp");
		// At the top and sideways too, or the key would fall through to the large nudge.
		expect(
			arrowCommandId(
				canvasWith(slotSelection(["stereotype"])),
				"ArrowUp",
				true,
			),
		).toBe("record.extendSlotSelectionUp");
		expect(
			arrowCommandId(canvasWith(slotSelection(["name"])), "ArrowLeft", true),
		).toBe("record.extendSlotSelectionLeft");
	});

	it("leaves the nudge to a record selected as a whole", () => {
		expect(arrowCommandId(canvasWith(null), "ArrowUp")).toBe("move-up");
		expect(arrowCommandId(canvasWith(null), "ArrowUp", true)).toBe(
			"move-up-large",
		);
	});
});

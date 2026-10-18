import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type {
	CanvasControllerState,
	ICanvasRegistries,
} from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import { ER_ENTITY_COLUMN_SELECTION_COMMANDS } from "../erEntityColumnSelectionCommands";
import { ER_ENTITY_TEXT_SLOT_SELECTION_COMMANDS } from "../erEntityTextSlotSelectionCommands";

/** Three columns under the title. */
const ENTITY = erEntityToState({
	id: "e-1",
	type: "erEntity",
	x: 0,
	y: 0,
	name: "users",
	columns: [{ key: "PK", name: "id" }, { name: "email" }, { name: "name" }],
} as ErEntityDoc);

type PartSelection = CanvasControllerState["selection"]["part"];

/** A pick of `kind` made of `[anchorId, focusId]` ranges. */
const pickOf = (
	ranges: readonly (readonly [string, string])[],
	kind = TEXT_SLOT_PART_KIND,
): PartSelection => ({
	kind,
	ranges: ranges.map(([anchorId, focusId]) => ({ anchorId, focusId })),
});

/** A pick of one slot. */
const slotPick = (slotId: string): PartSelection => pickOf([[slotId, slotId]]);

/** A canvas holding that one entity, selected, with `part` standing on it. */
const canvasWith = (
	part: PartSelection,
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: { [ENTITY.id]: ENTITY },
		selection: { objectIds: [ENTITY.id], part },
		textEditState: null,
		activeDrag: null,
		objectMenuOpenId: "column",
		...overrides,
	}) as unknown as CanvasControllerState;

// The commands read nothing of the registries.
const registries = {} as ICanvasRegistries;

const commandById = (id: string) => {
	const command = ER_ENTITY_TEXT_SLOT_SELECTION_COMMANDS.find(
		(entry) => entry.id === id,
	);
	if (command === undefined) {
		throw new Error(`no command ${id}`);
	}
	return command;
};

const run = (
	id: string,
	state: CanvasControllerState,
): CanvasControllerState => {
	const { execute } = commandById(id);
	if (execute === undefined) {
		throw new Error(`command ${id} executes nothing`);
	}
	return execute(state, registries) as CanvasControllerState;
};

const canRun = (id: string, state: CanvasControllerState): boolean =>
	commandById(id).canExecute?.(state, registries) ?? true;

/** The part `id` leaves picked when run over `part`. */
const partAfter = (id: string, part: PartSelection): PartSelection =>
	run(id, canvasWith(part)).selection.part;

describe("erEntity text slot selection commands", () => {
	it("answers the bare and the Shift arrows", () => {
		expect(commandById("erEntity.selectTextSlotLeft").shortcuts).toEqual({
			default: [{ code: "ArrowLeft" }],
		});
		expect(
			commandById("erEntity.extendTextSlotSelectionRight").shortcuts,
		).toEqual({ default: [{ code: "ArrowRight", shift: true }] });
	});

	it("claims the arrows over a slot pick only, leaving a column pick to the column commands", () => {
		const slotState = canvasWith(slotPick("col:0:name"));
		const columnState = canvasWith(
			pickOf([["col:0", "col:0"]], "erEntityColumn"),
		);
		for (const { id } of ER_ENTITY_TEXT_SLOT_SELECTION_COMMANDS) {
			expect(canRun(id, slotState)).toBe(true);
			expect(canRun(id, columnState)).toBe(false);
			expect(canRun(id, canvasWith(null))).toBe(false);
			expect(
				canRun(
					id,
					canvasWith(slotPick("col:0:name"), {
						textEditState: { kind: "shape", text: "id" },
					} as Partial<CanvasControllerState>),
				),
			).toBe(false);
			expect(canRun(id, canvasWith(slotPick("col:7:name")))).toBe(false);
		}
		for (const command of ER_ENTITY_COLUMN_SELECTION_COMMANDS) {
			expect(command.canExecute?.(slotState, registries)).toBe(false);
		}
	});

	it("moves the pick one slot each way, keeping the field up and down, closing the submenu", () => {
		const down = run(
			"erEntity.selectTextSlotDown",
			canvasWith(slotPick("col:0:type")),
		);
		expect(down.selection.part).toEqual(slotPick("col:1:type"));
		expect(down.objectMenuOpenId).toBeNull();
		expect(
			partAfter("erEntity.selectTextSlotUp", slotPick("col:2:key")),
		).toEqual(slotPick("col:1:key"));
		expect(
			partAfter("erEntity.selectTextSlotRight", slotPick("col:1:key")),
		).toEqual(slotPick("col:1:name"));
		expect(
			partAfter("erEntity.selectTextSlotLeft", slotPick("col:1:type")),
		).toEqual(slotPick("col:1:name"));
	});

	it("steps between the title and column 0, the title going down to column 0's name", () => {
		expect(partAfter("erEntity.selectTextSlotDown", slotPick("name"))).toEqual(
			slotPick("col:0:name"),
		);
		for (const slotId of ["col:0:key", "col:0:name", "col:0:type"]) {
			expect(partAfter("erEntity.selectTextSlotUp", slotPick(slotId))).toEqual(
				slotPick("name"),
			);
		}
	});

	it("stays at the grid's edge, still claiming the key, and collapses a range onto its focus there", () => {
		for (const [id, slotId] of [
			["erEntity.selectTextSlotUp", "name"],
			["erEntity.selectTextSlotLeft", "name"],
			["erEntity.selectTextSlotRight", "name"],
			["erEntity.selectTextSlotDown", "col:2:name"],
			["erEntity.selectTextSlotLeft", "col:1:key"],
			["erEntity.selectTextSlotRight", "col:1:type"],
		] as const) {
			const state = canvasWith(slotPick(slotId));
			expect(canRun(id, state)).toBe(true);
			expect(run(id, state)).toBe(state);
		}
		expect(
			partAfter(
				"erEntity.selectTextSlotDown",
				pickOf([["col:0:name", "col:2:name"]]),
			),
		).toEqual(slotPick("col:2:name"));
	});

	it("collapses a pick of several onto the active focus's neighbour", () => {
		expect(
			partAfter(
				"erEntity.selectTextSlotRight",
				pickOf([
					["col:2:type", "col:2:type"],
					["col:0:key", "col:1:key"],
				]),
			),
		).toEqual(slotPick("col:1:name"));
	});

	it("widens and narrows the active range with Shift, keeping its anchor and the earlier ranges", () => {
		const widened = run(
			"erEntity.extendTextSlotSelectionDown",
			canvasWith(
				pickOf([
					["col:2:type", "col:2:type"],
					["col:0:name", "col:0:name"],
				]),
			),
		);
		expect(widened.selection.part).toEqual(
			pickOf([
				["col:2:type", "col:2:type"],
				["col:0:name", "col:1:name"],
			]),
		);
		const across = run("erEntity.extendTextSlotSelectionRight", widened);
		expect(across.selection.part).toEqual(
			pickOf([
				["col:2:type", "col:2:type"],
				["col:0:name", "col:1:type"],
			]),
		);
		const narrowed = run(
			"erEntity.extendTextSlotSelectionUp",
			run("erEntity.extendTextSlotSelectionLeft", across),
		);
		expect(narrowed.selection.part).toEqual(
			pickOf([
				["col:2:type", "col:2:type"],
				["col:0:name", "col:0:name"],
			]),
		);
	});

	it("moves the focus onto the title and back down with Shift", () => {
		const toTitle = run(
			"erEntity.extendTextSlotSelectionUp",
			canvasWith(slotPick("col:0:type")),
		);
		expect(toTitle.selection.part).toEqual(pickOf([["col:0:type", "name"]]));
		expect(
			run("erEntity.extendTextSlotSelectionDown", toTitle).selection.part,
		).toEqual(pickOf([["col:0:type", "col:0:name"]]));
	});

	it("keeps the focus at the grid's edge with Shift", () => {
		const bottom = canvasWith(pickOf([["col:0:key", "col:2:type"]]));
		expect(run("erEntity.extendTextSlotSelectionDown", bottom)).toBe(bottom);
		expect(run("erEntity.extendTextSlotSelectionRight", bottom)).toBe(bottom);
		const title = canvasWith(pickOf([["col:1:key", "name"]]));
		expect(run("erEntity.extendTextSlotSelectionUp", title)).toBe(title);
	});
});

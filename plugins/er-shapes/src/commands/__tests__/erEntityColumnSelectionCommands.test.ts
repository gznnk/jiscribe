import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type {
	CanvasControllerState,
	ICanvasRegistries,
} from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import { ER_ENTITY_COLUMN_SELECTION_COMMANDS } from "../erEntityColumnSelectionCommands";

/** Four columns, the last a primary key, drawn where it is declared. */
const ENTITY = erEntityToState({
	id: "e-1",
	type: "erEntity",
	x: 0,
	y: 0,
	nameWidth: 96,
	typeWidth: 100,
	name: "users",
	columns: [
		{ name: "email" },
		{ name: "name" },
		{ name: "created_at" },
		{ key: "PK", name: "id" },
	],
} as ErEntityDoc);

type PartSelection = CanvasControllerState["selection"]["part"];

/** A pick of `kind` made of `[anchorId, focusId]` ranges. */
const pickOf = (
	ranges: readonly (readonly [string, string])[],
	kind = "erEntityColumn",
): PartSelection => ({
	kind,
	ranges: ranges.map(([anchorId, focusId]) => ({ anchorId, focusId })),
});

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
	const command = ER_ENTITY_COLUMN_SELECTION_COMMANDS.find(
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

describe("erEntity column selection commands", () => {
	it("answers the bare and the Shift arrows, the modifier check leaving Alt+Shift to the insertions", () => {
		expect(commandById("erEntity.selectColumnUp").shortcuts).toEqual({
			default: [{ code: "ArrowUp" }],
		});
		expect(commandById("erEntity.extendColumnSelectionDown").shortcuts).toEqual(
			{ default: [{ code: "ArrowDown", shift: true }] },
		);
	});

	it("claims the arrows over a column pick only", () => {
		const ids = ER_ENTITY_COLUMN_SELECTION_COMMANDS.map(
			(command) => command.id,
		);
		for (const id of ids) {
			expect(canRun(id, canvasWith(pickOf([["col:0", "col:0"]])))).toBe(true);
			expect(
				canRun(
					id,
					canvasWith(
						pickOf([["col:0:name", "col:0:name"]], TEXT_SLOT_PART_KIND),
					),
				),
			).toBe(false);
			expect(canRun(id, canvasWith(null))).toBe(false);
			expect(
				canRun(
					id,
					canvasWith(pickOf([["col:0", "col:0"]]), {
						textEditState: { kind: "shape", text: "email" },
					} as Partial<CanvasControllerState>),
				),
			).toBe(false);
		}
	});

	it("moves the pick to the row above or below in declared order, closing the submenu", () => {
		const down = run(
			"erEntity.selectColumnDown",
			canvasWith(pickOf([["col:2", "col:2"]])),
		);
		expect(down.selection.part).toEqual(pickOf([["col:3", "col:3"]]));
		expect(down.objectMenuOpenId).toBeNull();

		const up = run(
			"erEntity.selectColumnUp",
			canvasWith(pickOf([["col:3", "col:3"]])),
		);
		expect(up.selection.part).toEqual(pickOf([["col:2", "col:2"]]));
	});

	it("collapses a pick of several onto the active focus's neighbour", () => {
		const result = run(
			"erEntity.selectColumnDown",
			canvasWith(
				pickOf([
					["col:3", "col:3"],
					["col:0", "col:1"],
				]),
			),
		);
		expect(result.selection.part).toEqual(pickOf([["col:2", "col:2"]]));
	});

	it("stays at the top and bottom row", () => {
		const top = canvasWith(pickOf([["col:0", "col:0"]]));
		expect(run("erEntity.selectColumnUp", top)).toBe(top);
		const bottom = canvasWith(pickOf([["col:3", "col:3"]]));
		expect(run("erEntity.selectColumnDown", bottom)).toBe(bottom);
		// A range collapses onto its focus at the edge.
		expect(
			run("erEntity.selectColumnDown", canvasWith(pickOf([["col:1", "col:3"]])))
				.selection.part,
		).toEqual(pickOf([["col:3", "col:3"]]));
	});

	it("widens and narrows the active range with Shift, keeping its anchor and the earlier ranges", () => {
		const widened = run(
			"erEntity.extendColumnSelectionDown",
			canvasWith(
				pickOf([
					["col:3", "col:3"],
					["col:1", "col:1"],
				]),
			),
		);
		expect(widened.selection.part).toEqual(
			pickOf([
				["col:3", "col:3"],
				["col:1", "col:2"],
			]),
		);

		const narrowed = run("erEntity.extendColumnSelectionUp", widened);
		expect(narrowed.selection.part).toEqual(
			pickOf([
				["col:3", "col:3"],
				["col:1", "col:1"],
			]),
		);

		const pastAnchor = run("erEntity.extendColumnSelectionUp", narrowed);
		expect(pastAnchor.selection.part).toEqual(
			pickOf([
				["col:3", "col:3"],
				["col:1", "col:0"],
			]),
		);
	});

	it("keeps the focus at the top and bottom row with Shift", () => {
		const bottom = canvasWith(pickOf([["col:0", "col:3"]]));
		expect(run("erEntity.extendColumnSelectionDown", bottom)).toBe(bottom);
	});

	it("leaves the pick as it is for left and right, still claiming the keys", () => {
		const state = canvasWith(pickOf([["col:0", "col:1"]]));
		for (const id of [
			"erEntity.selectColumnLeft",
			"erEntity.selectColumnRight",
			"erEntity.extendColumnSelectionLeft",
			"erEntity.extendColumnSelectionRight",
		]) {
			expect(canRun(id, state)).toBe(true);
			expect(run(id, state)).toBe(state);
		}
	});
});

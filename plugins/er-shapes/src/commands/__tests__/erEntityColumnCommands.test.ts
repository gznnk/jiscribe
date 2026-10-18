import { createCanvasRegistries } from "@jiscribe/canvas";
import { TEXT_SLOT_PART_KIND } from "@jiscribe/canvas-sdk";
import type {
	CanvasControllerState,
	ICanvasRegistries,
} from "@jiscribe/canvas-sdk";
import { describe, expect, it } from "vitest";

import { erPlugin } from "../../plugin";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erEntityToState } from "../../state/ErEntityMapper";
import type { ErEntityState } from "../../state/ErEntityState";
import { ER_ENTITY_COLUMN_COMMANDS } from "../erEntityColumnCommands";

const ENTITY = erEntityToState({
	id: "e-1",
	type: "erEntity",
	x: 0,
	y: 0,
	nameWidth: 96,
	typeWidth: 100,
	name: "users",
	columns: [
		{ key: "PK", name: "id", type: "bigint" },
		{ name: "email", type: "text" },
		{ name: "name", type: "text" },
	],
} as ErEntityDoc);

type PartSelection = CanvasControllerState["selection"]["part"];

/** A pick of one part of the entity. */
const pickOf = (kind: string, partId: string): PartSelection => ({
	kind,
	ranges: [{ anchorId: partId, focusId: partId }],
});

/**
 * A canvas holding that one entity, selected, with `part` standing on it. Only
 * the fields the commands read are filled in.
 */
const canvasWith = (
	part: PartSelection,
	overrides: Partial<CanvasControllerState> = {},
): CanvasControllerState =>
	({
		objects: { [ENTITY.id]: ENTITY },
		selection: { objectIds: [ENTITY.id], part },
		textEditState: null,
		objectMenuOpenId: null,
		lastDuplicate: null,
		commitVersion: 7,
		...overrides,
	}) as unknown as CanvasControllerState;

const registries = createCanvasRegistries({
	plugins: [erPlugin],
}) as unknown as ICanvasRegistries;

const commandById = (id: string) => {
	const command = ER_ENTITY_COLUMN_COMMANDS.find((entry) => entry.id === id);
	if (command === undefined) {
		throw new Error(`no command ${id}`);
	}
	return command;
};

const canRun = (id: string, state: CanvasControllerState): boolean =>
	commandById(id).canExecute(state, registries);

const run = (id: string, state: CanvasControllerState) =>
	commandById(id).execute(state, registries);

/** The built-in Delete, which reaches the column kind's `delete` (DeleteCommand). */
const runDelete = (state: CanvasControllerState): CanvasControllerState => {
	const execute = registries.command.get("delete")?.execute;
	if (execute === undefined) {
		throw new Error("no built-in delete");
	}
	return execute(state, registries);
};

/** A pick of the run of columns from `anchorId` to `focusId`. */
const columnRangeOf = (anchorId: string, focusId: string): PartSelection => ({
	kind: "erEntityColumn",
	ranges: [{ anchorId, focusId }],
});

const entityOf = (state: CanvasControllerState): ErEntityState =>
	state.objects[ENTITY.id] as ErEntityState;

/** The column names in declared order. */
const columnNamesOf = (state: CanvasControllerState): unknown[] => {
	const { text } = entityOf(state);
	const names: unknown[] = [];
	for (let index = 0; `col:${index}:name` in text; index++) {
		names.push(text[`col:${index}:name`].text);
	}
	return names;
};

describe("erEntity insert commands", () => {
	it("offers above and below for a picked column or column slot, append for the whole entity", () => {
		const columnPick = canvasWith(pickOf("erEntityColumn", "col:1"));
		const slotPick = canvasWith(pickOf(TEXT_SLOT_PART_KIND, "col:1:type"));
		const wholeEntity = canvasWith(null);

		for (const state of [columnPick, slotPick]) {
			expect(canRun("erEntity.insertColumnAbove", state)).toBe(true);
			expect(canRun("erEntity.insertColumnBelow", state)).toBe(true);
			expect(canRun("erEntity.appendColumn", state)).toBe(false);
		}
		expect(canRun("erEntity.insertColumnAbove", wholeEntity)).toBe(false);
		expect(canRun("erEntity.insertColumnBelow", wholeEntity)).toBe(false);
		expect(canRun("erEntity.appendColumn", wholeEntity)).toBe(true);
	});

	it("offers nothing for the title slot, an open editor or several objects", () => {
		const titlePick = canvasWith(pickOf(TEXT_SLOT_PART_KIND, "name"));
		const editing = canvasWith(pickOf(TEXT_SLOT_PART_KIND, "col:1:name"), {
			textEditState: { kind: "shape", text: "email" },
		});
		const severalObjects = canvasWith(null, {
			selection: { objectIds: [ENTITY.id, "other"], part: null },
		});
		for (const id of [
			"erEntity.insertColumnAbove",
			"erEntity.insertColumnBelow",
			"erEntity.appendColumn",
		]) {
			expect(canRun(id, titlePick)).toBe(false);
			expect(canRun(id, editing)).toBe(false);
			expect(canRun(id, severalObjects)).toBe(false);
		}
	});

	it("inserts above the picked column and opens the new column's name", () => {
		const result = run(
			"erEntity.insertColumnAbove",
			canvasWith(pickOf("erEntityColumn", "col:1")),
		);
		expect(columnNamesOf(result)).toEqual(["id", "", "email", "name"]);
		expect(result.commitVersion).toBe(8);
		expect(result.selection.part).toEqual(
			pickOf(TEXT_SLOT_PART_KIND, "col:1:name"),
		);
		expect(result.textEditState).toEqual({ kind: "shape", text: "" });
	});

	it("inserts below the column of a picked slot", () => {
		const result = run(
			"erEntity.insertColumnBelow",
			canvasWith(pickOf(TEXT_SLOT_PART_KIND, "col:1:key")),
		);
		expect(columnNamesOf(result)).toEqual(["id", "email", "", "name"]);
		expect(result.selection.part).toEqual(
			pickOf(TEXT_SLOT_PART_KIND, "col:2:name"),
		);
	});

	it("inserts outside a range of slots spanning several columns", () => {
		const range: PartSelection = {
			kind: TEXT_SLOT_PART_KIND,
			ranges: [{ anchorId: "col:0:type", focusId: "col:1:key" }],
		};
		expect(
			columnNamesOf(run("erEntity.insertColumnBelow", canvasWith(range))),
		).toEqual(["id", "email", "", "name"]);
		expect(
			columnNamesOf(run("erEntity.insertColumnAbove", canvasWith(range))),
		).toEqual(["", "id", "email", "name"]);
	});

	it("appends to the whole entity, an entity of no columns included", () => {
		expect(
			columnNamesOf(run("erEntity.appendColumn", canvasWith(null))),
		).toEqual(["id", "email", "name", ""]);

		const emptied = runDelete(canvasWith(columnRangeOf("col:0", "col:2")));
		expect(columnNamesOf(emptied)).toEqual([]);
		const appended = run("erEntity.appendColumn", emptied);
		expect(columnNamesOf(appended)).toEqual([""]);
		expect(appended.selection.part).toEqual(
			pickOf(TEXT_SLOT_PART_KIND, "col:0:name"),
		);
	});
});

describe("erEntity column pick commands", () => {
	it("claims Enter only over a picked column", () => {
		const id = "erEntity.editColumnName";
		expect(canRun(id, canvasWith(pickOf("erEntityColumn", "col:0")))).toBe(
			true,
		);
		expect(
			canRun(id, canvasWith(pickOf(TEXT_SLOT_PART_KIND, "col:0:name"))),
		).toBe(false);
		expect(canRun(id, canvasWith(null))).toBe(false);
	});

	it("leaves Delete and Backspace to the built-in command", () => {
		const boundCodes = ER_ENTITY_COLUMN_COMMANDS.flatMap(
			(command) => command.shortcuts?.default ?? [],
		).map((binding) => binding.code);
		expect(boundCodes).not.toContain("Delete");
		expect(boundCodes).not.toContain("Backspace");
	});

	it("opens the active column's name on Enter under a pick of several", () => {
		const result = run(
			"erEntity.editColumnName",
			canvasWith({
				kind: "erEntityColumn",
				ranges: [{ anchorId: "col:0", focusId: "col:2" }],
			}),
		);
		expect(result.textEditState).toEqual({ kind: "shape", text: "name" });
	});

	it("opens the picked column's name on Enter", () => {
		const result = run(
			"erEntity.editColumnName",
			canvasWith(pickOf("erEntityColumn", "col:1")),
		);
		expect(result.selection.part).toEqual(
			pickOf(TEXT_SLOT_PART_KIND, "col:1:name"),
		);
		expect(result.textEditState).toEqual({ kind: "shape", text: "email" });
		expect(result.commitVersion).toBe(7);
	});
});

describe("the built-in Delete over a column pick", () => {
	it("deletes the picked column in one commit and drops the pick", () => {
		const result = runDelete(canvasWith(pickOf("erEntityColumn", "col:1")));
		expect(columnNamesOf(result)).toEqual(["id", "name"]);
		expect(result.commitVersion).toBe(8);
		expect(result.selection).toEqual({ objectIds: [ENTITY.id], part: null });
	});

	it("deletes every column a pick of several covers", () => {
		const result = runDelete(
			canvasWith({
				kind: "erEntityColumn",
				ranges: [
					{ anchorId: "col:2", focusId: "col:2" },
					{ anchorId: "col:0", focusId: "col:0" },
				],
			}),
		);
		expect(columnNamesOf(result)).toEqual(["email"]);
		expect(result.commitVersion).toBe(8);
		expect(result.selection.part).toBeNull();
	});

	it("deletes a range of columns, every one of them included", () => {
		expect(
			columnNamesOf(runDelete(canvasWith(columnRangeOf("col:0", "col:1")))),
		).toEqual(["name"]);

		const emptied = runDelete(canvasWith(columnRangeOf("col:0", "col:2")));
		expect(columnNamesOf(emptied)).toEqual([]);
		expect(emptied.objects[ENTITY.id]).toBeDefined();
		expect(emptied.selection).toEqual({ objectIds: [ENTITY.id], part: null });
	});

	it("empties a picked slot rather than removing its column", () => {
		const result = runDelete(
			canvasWith(pickOf(TEXT_SLOT_PART_KIND, "col:1:type")),
		);
		expect(columnNamesOf(result)).toEqual(["id", "email", "name"]);
		expect(entityOf(result).text["col:1:type"].text).toBe("");
	});
});

describe("erEntity column commands and the connectors on the columns", () => {
	/** An end attached to one connect point of an object. */
	const endOn = (ownerId: string, connectPointId: string) => ({
		owner: { id: ownerId },
		anchor: { kind: "connectPoint", id: connectPointId },
	});

	const FREE_END = { anchor: { kind: "free", point: { x: 400, y: 0 } } };

	/** Connectors on the entity's columns, on its top edge, and on a column of another entity. */
	const CONNECTORS = {
		"c-right-1": {
			id: "c-right-1",
			type: "connector",
			source: endOn(ENTITY.id, "col:1:right"),
			target: FREE_END,
		},
		"c-left-0": {
			id: "c-left-0",
			type: "connector",
			source: FREE_END,
			target: endOn(ENTITY.id, "col:0:left"),
		},
		"c-top": {
			id: "c-top",
			type: "connector",
			source: endOn(ENTITY.id, "topCenter"),
			target: FREE_END,
		},
		"c-other": {
			id: "c-other",
			type: "connector",
			source: endOn("e-2", "col:1:right"),
			target: FREE_END,
		},
	};

	const canvasWithConnectors = (part: PartSelection) =>
		canvasWith(part, {
			objects: {
				[ENTITY.id]: ENTITY,
				...CONNECTORS,
			} as unknown as CanvasControllerState["objects"],
		});

	/** One end of one connector of a canvas. */
	const endOf = (
		state: CanvasControllerState,
		connectorId: string,
		end: "source" | "target",
	): unknown =>
		(state.objects[connectorId] as unknown as Record<string, unknown>)[end];

	it("moves the connectors on the columns at and past an insertion along with them, in the one commit", () => {
		const start = canvasWithConnectors(pickOf("erEntityColumn", "col:1"));
		const result = run("erEntity.insertColumnAbove", start);

		expect(result.commitVersion).toBe(start.commitVersion + 1);
		expect(endOf(result, "c-right-1", "source")).toEqual(
			endOn(ENTITY.id, "col:2:right"),
		);
		expect(endOf(result, "c-right-1", "target")).toBe(FREE_END);
		// Ahead of the insertion, on the edge midpoints or on another entity: untouched.
		for (const connectorId of ["c-left-0", "c-top", "c-other"]) {
			expect(result.objects[connectorId]).toBe(start.objects[connectorId]);
		}
	});

	it("moves the connectors on the columns behind a removal up with them, in the one commit", () => {
		const start = canvasWithConnectors(pickOf("erEntityColumn", "col:0"));
		const result = runDelete(start);
		expect(result.commitVersion).toBe(start.commitVersion + 1);
		expect(endOf(result, "c-right-1", "source")).toEqual(
			endOn(ENTITY.id, "col:0:right"),
		);
		for (const connectorId of ["c-top", "c-other"]) {
			expect(result.objects[connectorId]).toBe(start.objects[connectorId]);
		}
	});

	it("keeps a connector on a removed column attached to the same side, where the row stood", () => {
		const removedFirst = runDelete(
			canvasWithConnectors(pickOf("erEntityColumn", "col:0")),
		);
		// Row 0's center was 28 + 12.5 below the top; the box is now 28 + 25 * 2 tall.
		expect(endOf(removedFirst, "c-left-0", "target")).toEqual({
			owner: { id: ENTITY.id },
			anchor: { kind: "edge", side: "left", t: 0.5192 },
		});

		const removedSecond = runDelete(
			canvasWithConnectors(pickOf("erEntityColumn", "col:1")),
		);
		// Row 1's center was 28 + 25 + 12.5 below the top.
		expect(endOf(removedSecond, "c-right-1", "source")).toEqual({
			owner: { id: ENTITY.id },
			anchor: { kind: "edge", side: "right", t: 0.8397 },
		});
		expect(removedSecond.objects["c-left-0"]).toBe(CONNECTORS["c-left-0"]);
	});

	it("holds the end at the bottom edge when the row stood below the box left behind", () => {
		const result = runDelete(
			canvasWithConnectors({
				kind: "erEntityColumn",
				ranges: [{ anchorId: "col:0", focusId: "col:2" }],
			}),
		);
		// One empty row is left: 28 + 25 tall, row 1's center 65.5 below the top.
		expect(endOf(result, "c-right-1", "source")).toEqual({
			owner: { id: ENTITY.id },
			anchor: { kind: "edge", side: "right", t: 1 },
		});
	});
});

describe("erEntity text style target", () => {
	it("sends a text style under a slot pick to that slot alone", () => {
		const textSlotKind = registries.objectPartKind.get(
			"erEntity",
			TEXT_SLOT_PART_KIND,
		);
		expect(textSlotKind?.textSlotIds?.(ENTITY, ["col:1:type"])).toEqual([
			"col:1:type",
		]);
	});
});

import { commitEdit, readActivePartFocusId } from "@jiscribe/canvas-sdk";
import type {
	CanvasControllerState,
	ExecutableCommand,
	ICanvasRegistries,
	KeyBinding,
	LocaleMessages,
} from "@jiscribe/canvas-sdk";

import { openErEntityTextSlotEditor } from "./openErEntityTextSlotEditor";
import {
	collectPickedErEntityColumnIndices,
	readErEntityCommandTarget,
} from "./readErEntityCommandTarget";
import { listErEntityColumnSourcesForInsert } from "../columns/insertErEntityColumn";
import { rewriteErEntityColumnsWithConnectors } from "../columns/rewriteErEntityColumnsWithConnectors";
import { ER_ENTITY_COLUMN_PART_KIND } from "../parts/erEntityColumnPartKind";
import {
	parseErEntityColumnPartId,
	countErEntityColumns,
	erEntityColumnTextSlotId,
} from "../schema/erEntityColumnIds";
import type { ErEntityState } from "../state/ErEntityState";

/** The ids of the three insertions, which the menu and the sidebar key their buttons by. */
export type ErEntityInsertCommandId =
	| "erEntity.insertColumnAbove"
	| "erEntity.insertColumnBelow"
	| "erEntity.appendColumn";

/** An insertion, its id narrowed to the three. */
export type ErEntityInsertCommand = ExecutableCommand & {
	id: ErEntityInsertCommandId;
};

/** Where a new column goes, or null when the command is unavailable. */
type ErEntityInsertPositionReader = (
	state: CanvasControllerState,
	registries: ICanvasRegistries,
) => number | null;

/** One insertion's id, wording, key and position. */
type ErEntityInsertCommandSpec = {
	id: ErEntityInsertCommandId;
	label: LocaleMessages<string>;
	/** Alt+Shift plus this arrow (the table's row insertion key), or undefined for no key. */
	arrowCode?: string;
	readInsertPosition: ErEntityInsertPositionReader;
};

/**
 * Where an insertion next to the picked columns goes: at the topmost referenced
 * column for `"above"`, one past the bottommost for `"below"`, in declared
 * order. Null with nothing picked that names a column.
 */
const readInsertPositionBeside =
	(side: "above" | "below"): ErEntityInsertPositionReader =>
	(state, registries) => {
		const target = readErEntityCommandTarget(state);
		if (target === null) {
			return null;
		}
		const columnIndices = collectPickedErEntityColumnIndices(
			state,
			target.entity,
			registries.objectPartKind,
		);
		if (columnIndices.length === 0) {
			return null;
		}
		return side === "above"
			? columnIndices[0]
			: columnIndices[columnIndices.length - 1] + 1;
	};

/** Past the last column, offered while the entity is selected as a whole. */
const readAppendPosition: ErEntityInsertPositionReader = (state) => {
	const target = readErEntityCommandTarget(state);
	if (target === null || state.selection.part !== null) {
		return null;
	}
	return countErEntityColumns(target.entity.text);
};

const ER_ENTITY_INSERT_COMMAND_SPECS: readonly ErEntityInsertCommandSpec[] = [
	{
		id: "erEntity.insertColumnAbove",
		label: { en: "Add Column Above", ja: "上にカラムを追加" },
		arrowCode: "ArrowUp",
		readInsertPosition: readInsertPositionBeside("above"),
	},
	{
		id: "erEntity.insertColumnBelow",
		label: { en: "Add Column Below", ja: "下にカラムを追加" },
		arrowCode: "ArrowDown",
		readInsertPosition: readInsertPositionBeside("below"),
	},
	{
		id: "erEntity.appendColumn",
		label: { en: "Add Column at Bottom", ja: "一番下にカラムを追加" },
		readInsertPosition: readAppendPosition,
	},
];

/** The binding one spec answers to on every platform, the modifier check being exact. */
const toKeyBinding = (arrowCode: string): KeyBinding => ({
	code: arrowCode,
	alt: true,
	shift: true,
});

/**
 * Builds one insertion. The command commits its own edit (commitEdit) — the
 * entity and the connectors on the columns that moved along, in one step
 * (rewriteErEntityColumnsWithConnectors) — then opens the editor on the new column's name: typing it is why a column is added, so the
 * pick goes straight to it rather than being remapped past the insertion.
 */
const createErEntityInsertCommand = (
	spec: ErEntityInsertCommandSpec,
): ErEntityInsertCommand => ({
	id: spec.id,
	label: spec.label,
	category: "edit",
	...(spec.arrowCode !== undefined && {
		shortcuts: { default: [toKeyBinding(spec.arrowCode)] },
	}),

	canExecute: (state, registries) =>
		spec.readInsertPosition(state, registries) !== null,

	execute: (state, registries) => {
		const target = readErEntityCommandTarget(state);
		const at = spec.readInsertPosition(state, registries);
		if (target === null || at === null) {
			return state;
		}
		const objects = rewriteErEntityColumnsWithConnectors(
			state.objects,
			target.objectId,
			listErEntityColumnSourcesForInsert(target.entity, at),
		);
		const committed = commitEdit({ ...state, objects });
		return openErEntityTextSlotEditor(
			committed,
			objects[target.objectId] as ErEntityState,
			erEntityColumnTextSlotId(at, "name"),
		);
	},
});

/**
 * The three insertions in the order the surfaces offer them: above and below the
 * picked column or slot, then at the bottom with the entity selected as a whole.
 */
export const ER_ENTITY_INSERT_COMMANDS: readonly ErEntityInsertCommand[] =
	ER_ENTITY_INSERT_COMMAND_SPECS.map(createErEntityInsertCommand);

/** The active column of a column pick — its active range's focus — or null when none is picked. */
const readPickedColumnIndex = (state: CanvasControllerState): number | null => {
	const target = readErEntityCommandTarget(state);
	const pick = state.selection.part;
	if (
		target === null ||
		pick === null ||
		pick.kind !== ER_ENTITY_COLUMN_PART_KIND
	) {
		return null;
	}
	const columnIndex = parseErEntityColumnPartId(readActivePartFocusId(pick));
	return columnIndex !== null &&
		columnIndex < countErEntityColumns(target.entity.text)
		? columnIndex
		: null;
};

/**
 * Enter over a column pick: opens the editor on the active column's name, the
 * text a column is mostly edited for. Claimed ahead of the built-in Enter, which would
 * open the first slot, the title, for a pick that is not a slot.
 */
const editErEntityColumnNameCommand: ExecutableCommand = {
	id: "erEntity.editColumnName",
	label: { en: "Edit Column Name", ja: "カラム名を編集" },
	category: "edit",
	shortcuts: { default: [{ code: "Enter" }] },

	canExecute: (state) => readPickedColumnIndex(state) !== null,

	execute: (state) => {
		const target = readErEntityCommandTarget(state);
		const columnIndex = readPickedColumnIndex(state);
		if (target === null || columnIndex === null) {
			return state;
		}
		return openErEntityTextSlotEditor(
			state,
			target.entity,
			erEntityColumnTextSlotId(columnIndex, "name"),
		);
	},
};

/**
 * The entity's command contributions, wired in through `CanvasPlugin.commands`:
 * the three insertions, and Enter over a column pick. Delete over one is the
 * built-in command's, through the column kind's `delete`.
 */
export const ER_ENTITY_COLUMN_COMMANDS: readonly ExecutableCommand[] = [
	...ER_ENTITY_INSERT_COMMANDS,
	editErEntityColumnNameCommand,
];

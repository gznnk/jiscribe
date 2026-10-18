import type {
	ObjectPartRange,
	ObjectPartSelection,
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import { ER_ENTITY_COLUMN_PART_KIND } from "../parts/erEntityColumnPartKind";
import {
	erEntityColumnPartId,
	parseErEntityColumnPartId,
	countErEntityColumns,
} from "../schema/erEntityColumnIds";
import type { ErEntityState } from "../state/ErEntityState";

/** A range naming the one column. */
const singleColumnRange = (partId: string): ObjectPartRange => ({
	anchorId: partId,
	focusId: partId,
});

/** Where a range's ends and one column sit, as declared column indices. */
type ColumnPositions = { anchor: number; focus: number; column: number };

/** The range's ends and the column as declared indices; null when an end is not a column the entity has. */
const readColumnPositions = (
	range: ObjectPartRange,
	columnIndex: number,
	columnCount: number,
): ColumnPositions | null => {
	const anchor = parseErEntityColumnPartId(range.anchorId);
	const focus = parseErEntityColumnPartId(range.focusId);
	if (
		anchor === null ||
		focus === null ||
		anchor >= columnCount ||
		focus >= columnCount
	) {
		return null;
	}
	return { anchor, focus, column: columnIndex };
};

/** Whether the positions put the column between the range's ends, either way round. */
const isColumnBetweenEnds = (positions: ColumnPositions): boolean =>
	positions.column >= Math.min(positions.anchor, positions.focus) &&
	positions.column <= Math.max(positions.anchor, positions.focus);

/** Whether the range runs over the column; false when its ends are not columns the entity has. */
const rangeCoversColumn = (
	range: ObjectPartRange,
	columnIndex: number,
	columnCount: number,
): boolean => {
	const positions = readColumnPositions(range, columnIndex, columnCount);
	return positions !== null && isColumnBetweenEnds(positions);
};

/**
 * The range with the one column taken out: what is left on the anchor's side
 * first, then what is left on the focus's side, each running the way the range
 * did. The range itself when it does not cover the column.
 */
const removeColumnFromRange = (
	range: ObjectPartRange,
	columnIndex: number,
	columnCount: number,
): ObjectPartRange[] => {
	const positions = readColumnPositions(range, columnIndex, columnCount);
	if (positions === null || !isColumnBetweenEnds(positions)) {
		return [range];
	}
	const { anchor, focus, column } = positions;
	const step = focus >= anchor ? 1 : -1;
	const remaining: ObjectPartRange[] = [];
	if (anchor !== column) {
		remaining.push({
			anchorId: range.anchorId,
			focusId: erEntityColumnPartId(column - step),
		});
	}
	if (focus !== column) {
		remaining.push({
			anchorId: erEntityColumnPartId(column + step),
			focusId: range.focusId,
		});
	}
	return remaining;
};

/**
 * Ctrl / Meta over a column pick: takes the column out of every range covering
 * it, or adds it as a range of its own — the new active range — when none does.
 * Taking out the last picked column clears the pick, leaving the entity selected
 * as an object.
 */
const toggleColumn = (
	current: ObjectPartSelection,
	columnIndex: number,
	columnCount: number,
): ObjectPartSelection | null => {
	if (
		!current.ranges.some((range) =>
			rangeCoversColumn(range, columnIndex, columnCount),
		)
	) {
		return {
			kind: current.kind,
			ranges: [
				...current.ranges,
				singleColumnRange(erEntityColumnPartId(columnIndex)),
			],
		};
	}
	const remaining = current.ranges.flatMap((range) =>
		removeColumnFromRange(range, columnIndex, columnCount),
	);
	return remaining.length === 0
		? null
		: { kind: current.kind, ranges: remaining };
};

/**
 * Shift over a column pick: moves the active (last) range's focus to the
 * column, its anchor and every earlier range kept. Null when the focus is
 * already there.
 */
const extendColumnRange = (
	current: ObjectPartSelection,
	partId: string,
): ObjectPartSelection | null => {
	const activeRange = current.ranges[current.ranges.length - 1];
	if (activeRange.focusId === partId) {
		return null;
	}
	return {
		kind: current.kind,
		ranges: [
			...current.ranges.slice(0, -1),
			{ anchorId: activeRange.anchorId, focusId: partId },
		],
	};
};

/**
 * A grip's click: picks the whole column as a part of its own kind, replacing
 * whatever was picked.
 *
 * Over a column pick already standing, the modifiers edit the pick rather than
 * replace it, as a table's track grips do. Shift (without Ctrl / Meta) moves the
 * active range's focus to the clicked column, its anchor kept, so the pick runs
 * over the rows between them (ER_ENTITY_COLUMN_PART_DEFINITION's `list`). Ctrl or Meta, with or without Shift, adds the column as a range of
 * its own or takes it out of the pick. Over no pick or a slot pick, a modified
 * click is a plain one.
 *
 * Writes the selection and nothing else, so a click on a grip is never a
 * document change. A part naming a column the entity no longer has is dropped
 * rather than picked, the grips and the state being one render apart.
 *
 * @param context - The control's entity, whose slots say which columns exist, and `selectedPart`, which the modified clicks edit
 * @param event - Only a click is acted on; its `subAction` is the column part id the grip appended to its action, and its `mods` choose between replacing, extending and toggling
 * @returns The new pick — null as the pick when Ctrl / Meta took out the last picked column — or null for any other event, a column the entity does not have, or a Shift-click on the active range's own focus
 */
export const handleErEntityColumnGrip = (
	context: SelectionControlContext<ErEntityState>,
	event: SelectionControlEvent,
): SelectionControlResult<ErEntityState> | null => {
	if (event.type !== "click") {
		return null;
	}
	const columnIndex = parseErEntityColumnPartId(event.subAction);
	const columnCount = countErEntityColumns(context.object.text);
	if (columnIndex === null || columnIndex >= columnCount) {
		return null;
	}
	const partId = erEntityColumnPartId(columnIndex);
	const { selectedPart } = context;
	const columnPick =
		selectedPart?.kind === ER_ENTITY_COLUMN_PART_KIND ? selectedPart : null;
	const { shift, ctrl, meta } = event.mods;
	if (columnPick !== null && (ctrl || meta)) {
		return {
			selection: toggleColumn(columnPick, columnIndex, columnCount),
		};
	}
	if (columnPick !== null && shift) {
		const extended = extendColumnRange(columnPick, partId);
		return extended === null ? null : { selection: extended };
	}
	return {
		selection: {
			kind: ER_ENTITY_COLUMN_PART_KIND,
			ranges: [singleColumnRange(partId)],
		},
	};
};

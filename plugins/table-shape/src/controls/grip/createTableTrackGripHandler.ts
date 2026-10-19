import type {
	ObjectPartRange,
	ObjectPartSelection,
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import {
	countTableTracks,
	parseTableTrackPartId,
	tableTrackPartId,
} from "../../grid/tableTrack";
import type { TableAxis } from "../../grid/tableTrack";
import type { TableState } from "../../state/TableState";

/** A range naming the one track. */
const singleTrackRange = (index: number): ObjectPartRange => {
	const partId = tableTrackPartId(index);
	return { anchorId: partId, focusId: partId };
};

/** Whether the range runs over the track; false when its ends are not track ids. */
const rangeCoversTrack = (range: ObjectPartRange, index: number): boolean => {
	const anchorIndex = parseTableTrackPartId(range.anchorId);
	const focusIndex = parseTableTrackPartId(range.focusId);
	return (
		anchorIndex !== null &&
		focusIndex !== null &&
		index >= Math.min(anchorIndex, focusIndex) &&
		index <= Math.max(anchorIndex, focusIndex)
	);
};

/**
 * The range with the one track taken out: what is left on the anchor's side
 * first, then what is left on the focus's side, each running the way the range
 * did. The range itself when it does not cover the track.
 */
const removeTrackFromRange = (
	range: ObjectPartRange,
	index: number,
): ObjectPartRange[] => {
	const anchorIndex = parseTableTrackPartId(range.anchorId);
	const focusIndex = parseTableTrackPartId(range.focusId);
	if (
		anchorIndex === null ||
		focusIndex === null ||
		!rangeCoversTrack(range, index)
	) {
		return [range];
	}
	const step = focusIndex >= anchorIndex ? 1 : -1;
	const remaining: ObjectPartRange[] = [];
	if (anchorIndex !== index) {
		remaining.push({
			anchorId: range.anchorId,
			focusId: tableTrackPartId(index - step),
		});
	}
	if (focusIndex !== index) {
		remaining.push({
			anchorId: tableTrackPartId(index + step),
			focusId: range.focusId,
		});
	}
	return remaining;
};

/**
 * Ctrl / Meta over a pick of the same axis: takes the track out of every range
 * covering it, or adds it as a range of its own — the new active range — when
 * none does. Taking out the last picked track clears the pick, leaving the table
 * selected as an object.
 */
const toggleTrack = (
	current: ObjectPartSelection,
	index: number,
): ObjectPartSelection | null => {
	if (!current.ranges.some((range) => rangeCoversTrack(range, index))) {
		return {
			kind: current.kind,
			ranges: [...current.ranges, singleTrackRange(index)],
		};
	}
	const remaining = current.ranges.flatMap((range) =>
		removeTrackFromRange(range, index),
	);
	return remaining.length === 0
		? null
		: { kind: current.kind, ranges: remaining };
};

/**
 * Shift over a pick of the same axis: moves the active (last) range's focus to
 * the track, its anchor and every earlier range kept. Null when the focus is
 * already there.
 */
const extendTrackRange = (
	current: ObjectPartSelection,
	index: number,
): ObjectPartSelection | null => {
	const partId = tableTrackPartId(index);
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
 * Builds the handler behind one axis's grips. A click selects that whole track as
 * a part of its own kind — not as the run of cells it covers — which is the
 * distinction Delete reads: a track is removed where a cell range only loses its
 * text.
 *
 * Over tracks of the same axis already picked, the modifiers edit the pick
 * rather than replace it, as a spreadsheet's headings do. Shift (without Ctrl /
 * Meta) moves the active range's focus to the clicked track, the way a Shift-click
 * on a cell grows its range in core. Ctrl or Meta, with or without Shift, adds
 * the track as a range of its own or takes it out of the pick. Over no pick, or
 * a pick of the other axis or of cells, a modified click is a plain one.
 *
 * The grip writes the selection and nothing else. It never returns an `object`,
 * so no click on it is a document change, and the whole strip is re-clickable
 * while a track is selected.
 *
 * Which track comes from the grip's `data-action`, one control being registered for
 * all of them; a part naming an index the grid no longer has is dropped rather
 * than selected, the strip and the state being one render apart.
 *
 * @param axis - Which tracks these grips stand for; also the part kind the click writes
 * @returns A handler for the definition's `handle`, to be paired with `events: ["click"]`; it reads `context.selectedPart` for the modified clicks and returns null where the pick would not change
 */
export const createTableTrackGripHandler =
	(axis: TableAxis) =>
	(
		context: SelectionControlContext<TableState>,
		event: SelectionControlEvent,
	): SelectionControlResult<TableState> | null => {
		if (event.type !== "click") {
			return null;
		}
		const index = parseTableTrackPartId(event.subAction);
		if (index === null || index >= countTableTracks(context.object, axis)) {
			return null;
		}
		const { selectedPart } = context;
		const sameAxisPart = selectedPart?.kind === axis ? selectedPart : null;
		const { shift, ctrl, meta } = event.mods;
		if (sameAxisPart !== null && (ctrl || meta)) {
			return { selection: toggleTrack(sameAxisPart, index) };
		}
		if (sameAxisPart !== null && shift) {
			const extended = extendTrackRange(sameAxisPart, index);
			return extended === null ? null : { selection: extended };
		}
		return { selection: { kind: axis, ranges: [singleTrackRange(index)] } };
	};

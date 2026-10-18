import type {
	ObjectPartRange,
	ObjectPartSelection,
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import type { ErEntityState } from "../state/ErEntityState";

/** How one strip of grips names what it stands for: the rows or the lanes. */
export type ErEntityGripParts = {
	/** The part kind a click on one of the grips writes. */
	kind: string;
	/** The part id of the item at a 0-based position along the strip. */
	toPartId: (index: number) => string;
	/** The position one part id names, or null when it is not one of this strip's ids. */
	parseIndex: (partId: string | undefined) => number | null;
	/** How many items the entity offers along the strip. */
	count: (object: ErEntityState) => number;
};

/** A range naming the one part. */
const singlePartRange = (partId: string): ObjectPartRange => ({
	anchorId: partId,
	focusId: partId,
});

/** Where a range's ends and one item sit, as positions along the strip. */
type RangePositions = { anchor: number; focus: number; item: number };

/** The range's ends and the item as positions; null when an end is not an item the entity has. */
const readRangePositions = (
	parts: ErEntityGripParts,
	range: ObjectPartRange,
	index: number,
	itemCount: number,
): RangePositions | null => {
	const anchor = parts.parseIndex(range.anchorId);
	const focus = parts.parseIndex(range.focusId);
	if (
		anchor === null ||
		focus === null ||
		anchor >= itemCount ||
		focus >= itemCount
	) {
		return null;
	}
	return { anchor, focus, item: index };
};

/** Whether the positions put the item between the range's ends, either way round. */
const isItemBetweenEnds = (positions: RangePositions): boolean =>
	positions.item >= Math.min(positions.anchor, positions.focus) &&
	positions.item <= Math.max(positions.anchor, positions.focus);

/**
 * The range with the one item taken out: what is left on the anchor's side
 * first, then what is left on the focus's side, each running the way the range
 * did. The range itself when it does not cover the item.
 */
const removeItemFromRange = (
	parts: ErEntityGripParts,
	range: ObjectPartRange,
	index: number,
	itemCount: number,
): ObjectPartRange[] => {
	const positions = readRangePositions(parts, range, index, itemCount);
	if (positions === null || !isItemBetweenEnds(positions)) {
		return [range];
	}
	const { anchor, focus, item } = positions;
	const step = focus >= anchor ? 1 : -1;
	const remaining: ObjectPartRange[] = [];
	if (anchor !== item) {
		remaining.push({
			anchorId: range.anchorId,
			focusId: parts.toPartId(item - step),
		});
	}
	if (focus !== item) {
		remaining.push({
			anchorId: parts.toPartId(item + step),
			focusId: range.focusId,
		});
	}
	return remaining;
};

/**
 * Ctrl / Meta over a pick of the same kind: takes the item out of every range
 * covering it, or adds it as a range of its own — the new active range — when
 * none does. Taking out the last picked item clears the pick, leaving the entity
 * selected as an object.
 */
const toggleItem = (
	parts: ErEntityGripParts,
	current: ObjectPartSelection,
	index: number,
	itemCount: number,
): ObjectPartSelection | null => {
	const isCovered = current.ranges.some((range) => {
		const positions = readRangePositions(parts, range, index, itemCount);
		return positions !== null && isItemBetweenEnds(positions);
	});
	if (!isCovered) {
		return {
			kind: current.kind,
			ranges: [...current.ranges, singlePartRange(parts.toPartId(index))],
		};
	}
	const remaining = current.ranges.flatMap((range) =>
		removeItemFromRange(parts, range, index, itemCount),
	);
	return remaining.length === 0
		? null
		: { kind: current.kind, ranges: remaining };
};

/**
 * Shift over a pick of the same kind: moves the active (last) range's focus to
 * the item, its anchor and every earlier range kept. Null when the focus is
 * already there.
 */
const extendRange = (
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
 * Builds the handler behind one strip of grips, as the table builds one per
 * axis (createTableTrackGripHandler). A click picks the whole row or lane as a
 * part of its own kind, replacing whatever was picked.
 *
 * Over a pick of the same kind already standing, the modifiers edit the pick
 * rather than replace it. Shift (without Ctrl / Meta) moves the active range's
 * focus to the clicked item, its anchor kept, so the pick runs over the items
 * between them (the kind's `list`). Ctrl or Meta, with or without Shift, adds the
 * item as a range of its own or takes it out of the pick. Over no pick or a pick
 * of another kind, a modified click is a plain one.
 *
 * Writes the selection and nothing else, so a click on a grip is never a
 * document change. A part naming an item the entity no longer has is dropped
 * rather than picked, the grips and the state being one render apart.
 *
 * @param parts - The strip's part kind and how its ids read and count
 * @returns A handler for the definition's `handle`, to be paired with `events: ["click"]`: it reads the event's `subAction` as the part id the grip appended to its action and `context.selectedPart` for the modified clicks, and returns the new pick — null as the pick when Ctrl / Meta took out the last picked item — or null for any other event, an item the entity does not have, or a Shift-click on the active range's own focus
 */
export const createErEntityGripHandler =
	(parts: ErEntityGripParts) =>
	(
		context: SelectionControlContext<ErEntityState>,
		event: SelectionControlEvent,
	): SelectionControlResult<ErEntityState> | null => {
		if (event.type !== "click") {
			return null;
		}
		const index = parts.parseIndex(event.subAction);
		const itemCount = parts.count(context.object);
		if (index === null || index >= itemCount) {
			return null;
		}
		const partId = parts.toPartId(index);
		const { selectedPart } = context;
		const sameKindPick =
			selectedPart?.kind === parts.kind ? selectedPart : null;
		const { shift, ctrl, meta } = event.mods;
		if (sameKindPick !== null && (ctrl || meta)) {
			return {
				selection: toggleItem(parts, sameKindPick, index, itemCount),
			};
		}
		if (sameKindPick !== null && shift) {
			const extended = extendRange(sameKindPick, partId);
			return extended === null ? null : { selection: extended };
		}
		return {
			selection: { kind: parts.kind, ranges: [singlePartRange(partId)] },
		};
	};

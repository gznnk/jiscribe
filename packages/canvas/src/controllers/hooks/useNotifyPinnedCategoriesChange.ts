import { useEffect, useRef } from "react";

import { useLatestRef } from "../../foundation/hooks/useLatestRef";

/**
 * Notifies the host when a library category is pinned to the rail or unpinned,
 * or a pin is dragged to another place in the pin order.
 *
 * Comparison is by value (the ids in order), not by reference: pins that end up
 * as they already were must not be reported. The callback goes through a ref so
 * a host passing a new function each render cannot re-fire the effect.
 *
 * Read-only by contract, like `onSidebarsChange`: the host persists what it is
 * handed and passes it back through `initialConfig.pinnedCategoryIds` at the
 * next mount, but there is no controlled prop to drive the pins with.
 *
 * The mount render establishes the baseline (the seeded pins, or none) and does
 * not notify; the host assumes what it passed in until the first change.
 *
 * @param pinnedCategoryIds - Live pins in rail order (reducer state), ids the
 *   library does not hold included; handed to the callback as they are, so the
 *   host must treat the array as read-only
 * @param onPinnedCategoriesChange - Callback invoked with the pins on any change
 */
export const useNotifyPinnedCategoriesChange = (
	pinnedCategoryIds: string[],
	onPinnedCategoriesChange?: (pinnedCategoryIds: string[]) => void,
): void => {
	const onPinnedCategoriesChangeRef = useLatestRef(onPinnedCategoriesChange);

	// null marks "before the first render"; the mount render only records the
	// baseline so the starting pins are not delivered as a change.
	const prevPinnedCategoryIdsRef = useRef<string[] | null>(null);
	useEffect(() => {
		const prevPinnedCategoryIds = prevPinnedCategoryIdsRef.current;
		if (
			prevPinnedCategoryIds !== null &&
			isSameCategoryIds(prevPinnedCategoryIds, pinnedCategoryIds)
		) {
			return;
		}
		const isMountBaseline = prevPinnedCategoryIds === null;
		prevPinnedCategoryIdsRef.current = pinnedCategoryIds;
		if (isMountBaseline) {
			return;
		}
		onPinnedCategoriesChangeRef.current?.(pinnedCategoryIds);
	}, [pinnedCategoryIds, onPinnedCategoriesChangeRef]);
};

/** True when two pin lists hold the same ids in the same order. */
const isSameCategoryIds = (a: string[], b: string[]): boolean =>
	a.length === b.length &&
	a.every((categoryId, index) => categoryId === b[index]);

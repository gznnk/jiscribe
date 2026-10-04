import { useEffect, useRef } from "react";

/**
 * Notifies the host when the selection changes.
 *
 * The selection is compared by content (same length + same ids in order): the
 * reducer can produce a new `selectedIds` array instance with identical contents
 * across unrelated dispatches, and re-firing on those would be spurious. The
 * callback goes through a ref so a host passing a new function on every render
 * cannot re-fire the effect on an unchanged selection.
 *
 * The mount render establishes the baseline (initial selection is empty) and
 * does not notify; the host assumes an empty selection until the first change.
 *
 * @param selection - The currently selected ids, a connector included (CanvasControllerState.selectedIds)
 * @param onSelectionChange - Callback invoked with the new selection on change
 */
export const useNotifySelectionChange = (
	selection: string[],
	onSelectionChange?: (selectedIds: string[]) => void,
): void => {
	const onSelectionChangeRef = useRef(onSelectionChange);
	useEffect(() => {
		onSelectionChangeRef.current = onSelectionChange;
	});

	// null marks "before the first render"; the mount render only records the
	// baseline so an initial (empty) selection is not delivered as a change.
	const prevSelectionRef = useRef<string[] | null>(null);
	useEffect(() => {
		const prevSelection = prevSelectionRef.current;
		if (prevSelection !== null && sameSelection(prevSelection, selection)) {
			return;
		}
		const isMountBaseline = prevSelection === null;
		prevSelectionRef.current = selection;
		if (isMountBaseline) {
			return;
		}
		onSelectionChangeRef.current?.(selection);
	}, [selection]);
};

const sameSelection = (a: string[], b: string[]): boolean => {
	if (a.length !== b.length) {
		return false;
	}
	return a.every((id, index) => id === b[index]);
};

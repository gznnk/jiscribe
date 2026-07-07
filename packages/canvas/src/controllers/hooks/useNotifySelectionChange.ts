import { useEffect, useMemo, useRef } from "react";

/**
 * Notifies the host when the selection changes.
 *
 * Shapes (`selectedIds`) and the connector (`selectedConnectorId`) are managed
 * separately and are mutually exclusive; they are merged into a single ordered
 * id list (shapes first, then the connector when present) so the host sees one
 * "what is selected" signal.
 *
 * The merged list is compared by content (same length + same ids in order):
 * the reducer can produce a new `selectedIds` array instance with identical
 * contents across unrelated dispatches, and re-firing on those would be
 * spurious. The callback goes through a ref so a host passing a new function on
 * every render cannot re-fire the effect on an unchanged selection.
 *
 * The mount render establishes the baseline (initial selection is empty) and
 * does not notify; the host assumes an empty selection until the first change.
 *
 * @param selectedIds - Currently selected shape IDs
 * @param selectedConnectorId - Currently selected connector ID (null when none)
 * @param onSelectionChange - Callback invoked with the new selection on change
 */
export const useNotifySelectionChange = (
	selectedIds: string[],
	selectedConnectorId: string | null,
	onSelectionChange?: (selectedIds: string[]) => void,
): void => {
	const onSelectionChangeRef = useRef(onSelectionChange);
	useEffect(() => {
		onSelectionChangeRef.current = onSelectionChange;
	});

	const selection = useMemo(
		() =>
			selectedConnectorId !== null
				? [...selectedIds, selectedConnectorId]
				: selectedIds,
		[selectedIds, selectedConnectorId],
	);

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

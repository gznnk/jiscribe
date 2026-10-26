/**
 * Where a dragged pin lands when dropped on another pinned category: in that
 * category's place, the way a sortable list moves an item onto the slot under
 * the pointer — before it when dragged up the pin order, after it when dragged
 * down.
 *
 * @param pinnedCategoryIds - The pin order (reducer state), ids the library
 *   does not hold included
 * @param draggedCategoryId - The pin being dragged; must be in `pinnedCategoryIds`
 * @param hoveredCategoryId - The category under the pointer
 * @returns The index in `pinnedCategoryIds` to insert before; null when the
 *   hovered category is not pinned, or the drop would leave the order as it is
 *   (the dragged pin itself)
 */
export const calcPinInsertionIndex = (
	pinnedCategoryIds: readonly string[],
	draggedCategoryId: string,
	hoveredCategoryId: string,
): number | null => {
	const draggedIndex = pinnedCategoryIds.indexOf(draggedCategoryId);
	const hoveredIndex = pinnedCategoryIds.indexOf(hoveredCategoryId);
	if (draggedIndex === -1 || hoveredIndex === -1) {
		return null;
	}
	if (hoveredIndex === draggedIndex) {
		return null;
	}
	return hoveredIndex < draggedIndex ? hoveredIndex : hoveredIndex + 1;
};

/**
 * The pin order with one pin moved.
 *
 * @param pinnedCategoryIds - The pin order (reducer state)
 * @param categoryId - The pin to move; an id not in the order returns the order as is
 * @param insertionIndex - The index in the current order to insert before,
 *   from 0 to `pinnedCategoryIds.length` (calcPinInsertionIndex)
 * @returns `pinnedCategoryIds` itself when the move changes nothing, a new array otherwise
 */
export const movePinnedCategory = (
	pinnedCategoryIds: string[],
	categoryId: string,
	insertionIndex: number,
): string[] => {
	const fromIndex = pinnedCategoryIds.indexOf(categoryId);
	if (
		fromIndex === -1 ||
		insertionIndex === fromIndex ||
		insertionIndex === fromIndex + 1
	) {
		return pinnedCategoryIds;
	}
	const movedIds = pinnedCategoryIds.filter(
		(pinnedId) => pinnedId !== categoryId,
	);
	const targetIndex =
		insertionIndex > fromIndex ? insertionIndex - 1 : insertionIndex;
	movedIds.splice(targetIndex, 0, categoryId);
	return movedIds;
};

/** Where the insertion line of a pin drag is drawn: beside which pin, on which side. */
export type PinInsertionMark = {
	categoryId: string;
	edge: "before" | "after";
};

/**
 * Turns a pin drag's insertion index into the drawn pin the line goes beside:
 * before the drawn pin coming first in the pin order at or after the index,
 * or after the drawn pin coming last when none does (the index is past every
 * drawn pin). A pin dropped past what the rail shows, with the "…" popover
 * closed, is therefore marked after the rail's last pin.
 *
 * @param pinnedCategoryIds - The pin order (reducer state), ids the library does not hold included
 * @param drawnPinnedCategoryIds - The pins drawn right now, in any order: the
 *   rail's, plus the "…" popover's only while it is shown. A pin the library
 *   does not hold, or one inside a closed popover, has nothing to draw a line beside
 * @param insertionIndex - The drag's `insertionIndex`; null draws no line
 * @returns null with no index or no drawn pin
 */
export const resolvePinInsertionMark = (
	pinnedCategoryIds: readonly string[],
	drawnPinnedCategoryIds: readonly string[],
	insertionIndex: number | null,
): PinInsertionMark | null => {
	if (insertionIndex === null || drawnPinnedCategoryIds.length === 0) {
		return null;
	}
	const drawnInPinOrder = [...drawnPinnedCategoryIds].sort(
		(left, right) =>
			pinnedCategoryIds.indexOf(left) - pinnedCategoryIds.indexOf(right),
	);
	const followingId = drawnInPinOrder.find(
		(categoryId) => pinnedCategoryIds.indexOf(categoryId) >= insertionIndex,
	);
	return followingId !== undefined
		? { categoryId: followingId, edge: "before" }
		: {
				categoryId: drawnInPinOrder[drawnInPinOrder.length - 1],
				edge: "after",
			};
};

/**
 * The side of `categoryId` a pin drag's line is drawn on.
 *
 * @param mark - From {@link resolvePinInsertionMark}; null draws no line anywhere
 * @param categoryId - The pin a rail button or popover row stands for
 * @returns null unless the mark names that pin
 */
export const pinInsertionEdgeOf = (
	mark: PinInsertionMark | null,
	categoryId: string,
): PinInsertionMark["edge"] | null =>
	mark !== null && mark.categoryId === categoryId ? mark.edge : null;

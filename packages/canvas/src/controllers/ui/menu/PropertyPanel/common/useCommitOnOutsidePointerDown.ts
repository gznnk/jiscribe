import { useEffect, useRef } from "react";

/**
 * Records a field's previewed edit when the press that would abandon it lands
 * elsewhere.
 *
 * A press on the canvas does not blur the field — the gesture layer keeps the
 * focus where it is — so deselecting takes the row away with the preview still
 * uncommitted: applied to the objects, but carrying no history entry and no
 * save request. The listener sits on the document in the capture phase, which
 * is ahead of the canvas's own handlers, so the commit is dispatched while the
 * selection it was typed for is still the one the canvas holds; committing from
 * an unmount cleanup would arrive after the selection has gone and be dropped
 * as a no-op.
 *
 * @param rootRef Element the field owns; a press inside it belongs to the
 *   field's own handlers and is left alone
 * @param commitPendingEdit Records the previewed edit, or does nothing when
 *   there is none — it is called for every press outside
 */
export const useCommitOnOutsidePointerDown = (
	rootRef: React.RefObject<HTMLElement | null>,
	commitPendingEdit: () => void,
): void => {
	// The handler is registered once, so it reads the current render's commit
	// rather than the one the first render closed over.
	const commitPendingEditRef = useRef(commitPendingEdit);
	commitPendingEditRef.current = commitPendingEdit;

	useEffect(() => {
		const handlePointerDown = (event: PointerEvent): void => {
			const root = rootRef.current;
			if (
				root !== null &&
				event.target instanceof Node &&
				root.contains(event.target)
			) {
				return;
			}
			commitPendingEditRef.current();
		};
		document.addEventListener("pointerdown", handlePointerDown, true);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown, true);
		};
	}, [rootRef]);
};

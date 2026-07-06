import { type RefObject, useEffect, useRef } from "react";

/**
 * Keeps the focusable canvas root (tabIndex-ed CanvasRoot) holding focus so the
 * container-scoped keyboard listeners (useKeyboardShortcuts / useClipboardPaste)
 * stay reachable. Shortcuts are scoped to the focused Canvas — this hook is what
 * guarantees "the Canvas the user is working in" actually has focus.
 *
 * Responsibilities:
 * - Initial focus on mount (opt-out via autoFocus, e.g. multi-Canvas embedding
 *   where the host manages focus).
 * - Focus-ownership tracking via native focusin/focusout on the container
 *   (both bubble, so any focus move inside the canvas updates the flag).
 * - Reclaiming focus after it falls to body: when the focused element inside
 *   the canvas is removed from the DOM (a menu control re-rendered by
 *   undo/redo, the text-edit textarea closing, etc.), focus falls back to
 *   body. The flag then still says "ours" while activeElement is body, and
 *   nothing else took focus — so it is safe to take it back.
 *
 * @param containerRef - Focusable canvas root element (CanvasRoot with tabIndex)
 * @param autoFocus - Focus the container on mount (Canvas prop, default true)
 */
export const useCanvasFocusScope = (
	containerRef: RefObject<HTMLElement | null>,
	autoFocus: boolean,
): void => {
	// Focus-ownership flag. Declared BEFORE the autoFocus effect: mount effects
	// run in declaration order, and the listeners must already be attached when
	// the initial focus() dispatches its focusin.
	const hasFocusWithinRef = useRef(false);
	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const handleFocusIn = () => {
			hasFocusWithinRef.current = true;
		};
		const handleFocusOut = (e: FocusEvent) => {
			// Release ownership ONLY when focus explicitly moved to another element.
			// A null relatedTarget means focus fell to body, which happens both when
			// the focused element is removed from the DOM (Chrome fires focusout with
			// relatedTarget=null on removal; Firefox fires nothing — both end up here
			// with the flag kept) and on a background click outside any focusable.
			// Keeping the flag lets the post-commit effect below reclaim focus; if we
			// cleared it here, the removal path would leave the keyboard scope dead.
			if (e.relatedTarget !== null) {
				hasFocusWithinRef.current = false;
			}
		};

		container.addEventListener("focusin", handleFocusIn);
		container.addEventListener("focusout", handleFocusOut);
		return () => {
			container.removeEventListener("focusin", handleFocusIn);
			container.removeEventListener("focusout", handleFocusOut);
		};
	}, [containerRef]);

	// Initial focus so shortcuts work before the first click.
	useEffect(() => {
		if (autoFocus) {
			containerRef.current?.focus();
		}
	}, [autoFocus, containerRef]);

	// Reclaim focus lost to the silent unmount path. Deliberately NO dependency
	// array: an unmount always happens in a React commit, so checking after every
	// render of the owning component is exactly the required timing. Adding []
	// here would break the reclaim (it would only ever run once on mount).
	useEffect(() => {
		if (hasFocusWithinRef.current && document.activeElement === document.body) {
			containerRef.current?.focus();
		}
	});
};

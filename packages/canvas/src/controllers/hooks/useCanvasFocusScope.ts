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
 *   nothing else took focus — so it is safe to take it back. The reclaim is
 *   gated on document.hasFocus() so an embedded Canvas (VSCode webview iframe)
 *   does not steal focus back when the user clicks host chrome outside the
 *   frame: focus leaves this document there, but stays within it on unmount.
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
			// The intentional-outside-click case is disambiguated by the reclaim's
			// document.hasFocus() gate, not here.
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

	// Initial focus so shortcuts work before the first click. Gated on
	// document.hasFocus() for the same reason as the reclaim below: an embedded
	// Canvas remounts whenever the host swaps it out and back (VSCode webview
	// replacing it with an error notice on a transient invalid doc, then
	// remounting on the next valid parse). If the user is editing elsewhere at
	// that moment (the text pane, another frame), this document does not have
	// focus, and autoFocus must not yank it into the freshly mounted Canvas.
	useEffect(() => {
		if (autoFocus && document.hasFocus()) {
			containerRef.current?.focus();
		}
	}, [autoFocus, containerRef]);

	// Reclaim focus lost to the silent unmount path. Deliberately NO dependency
	// array: an unmount always happens in a React commit, so checking after every
	// render of the owning component is exactly the required timing. Adding []
	// here would break the reclaim (it would only ever run once on mount).
	//
	// document.hasFocus() gates the reclaim to "focus is still inside OUR
	// document". When the Canvas is embedded in an iframe (VSCode webview) and
	// the user clicks host chrome outside the frame, the pointerdown never
	// reaches this document — but focus does leave it, so hasFocus() goes false
	// and we must NOT steal it back. On the silent-unmount path focus only falls
	// to body within this same document, so hasFocus() stays true and the reclaim
	// still fires.
	useEffect(() => {
		if (
			hasFocusWithinRef.current &&
			document.hasFocus() &&
			document.activeElement === document.body
		) {
			containerRef.current?.focus();
		}
	});
};

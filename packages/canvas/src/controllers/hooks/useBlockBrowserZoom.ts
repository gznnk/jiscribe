import { type RefObject, useEffect } from "react";

/**
 * Hook that keeps a Ctrl-held wheel anywhere on the canvas from zooming the browser.
 *
 * The canvas wheel listener is scoped to the drawing region (see useCanvasWheel), so
 * the chrome around it — the toolbar, the two sidebars, the modals — let a Ctrl-held
 * wheel through to the browser, which zooms the whole page. A trackpad pinch arrives
 * as the same event, so on a laptop the mismatch shows up without anyone pressing
 * Ctrl. Cancelling it here makes the zoom gesture mean the same thing over the whole
 * canvas: the drawing region zooms the view, the chrome does nothing.
 *
 * A plain wheel is left alone, so a sidebar's list keeps scrolling natively.
 *
 * @param rootRef - Reference to the canvas root element, which spans both the chrome
 *   and the drawing region; nothing is attached while it is null (before mount)
 */
export function useBlockBrowserZoom(
	rootRef: RefObject<HTMLElement | null>,
): void {
	useEffect(() => {
		const root = rootRef.current;
		if (!root) {
			return;
		}

		const onRootWheel = (e: WheelEvent) => {
			if (e.ctrlKey) {
				e.preventDefault();
			}
		};

		// capture: true so the wheel is cancelled wherever inside the canvas it lands,
		// ahead of any descendant's own listener. passive: false is required to call
		// preventDefault. Over the drawing region useCanvasWheel cancels it as well,
		// which costs nothing: preventDefault twice is the same as once.
		root.addEventListener("wheel", onRootWheel, {
			passive: false,
			capture: true,
		});

		return () => {
			root.removeEventListener("wheel", onRootWheel, { capture: true });
		};
	}, [rootRef]);
}

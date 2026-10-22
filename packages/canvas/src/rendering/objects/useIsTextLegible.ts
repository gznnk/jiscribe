import { useSyncExternalStore } from "react";

import type { CanvasZoomStore } from "./CanvasZoomStoreContext";
import { useCanvasZoomStoreContext } from "./CanvasZoomStoreContext";

/**
 * The smallest size, in CSS px on screen, a text is still drawn at. Below it the
 * glyphs cannot be read, so the foreignObject holding them is not worth the
 * layout the browser gives it on every frame of a zoomed-out drag.
 */
export const MIN_LEGIBLE_SCREEN_FONT_SIZE = 4;

/** Subscription for a tree with no canvas around it, where nothing ever changes. */
const subscribeToNothing = (): (() => void) => () => {};

const isTextLegibleIn = (
	zoomStore: CanvasZoomStore,
	maxFontSize: number,
): boolean =>
	zoomStore.isSnapshotRendering() ||
	maxFontSize * zoomStore.getZoom() >= MIN_LEGIBLE_SCREEN_FONT_SIZE;

/**
 * Whether a text is drawn large enough on screen to be read, at the zoom the
 * surrounding `<Canvas>` is drawn at (docs/08-rendering-and-theme.md).
 *
 * Subscribes to the answer alone, so a zoom step re-renders only the texts it
 * moves across the threshold.
 *
 * @param maxFontSize - The largest type size in the text, in CSS px at zoom 1
 *   (world units): the text counts as legible while that part of it is
 * @returns True at or above {@link MIN_LEGIBLE_SCREEN_FONT_SIZE} on screen, and
 *   always outside a `<Canvas>` or while a snapshot (export) is cloning the SVG
 */
export const useIsTextLegible = (maxFontSize: number): boolean => {
	const zoomStore = useCanvasZoomStoreContext();
	return useSyncExternalStore(zoomStore?.subscribe ?? subscribeToNothing, () =>
		zoomStore === null ? true : isTextLegibleIn(zoomStore, maxFontSize),
	);
};

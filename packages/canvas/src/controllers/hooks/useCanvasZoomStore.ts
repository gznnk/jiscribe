import { useLayoutEffect } from "react";

import type { WritableCanvasZoomStore } from "./utils/createCanvasZoomStore";
import { createCanvasZoomStore } from "./utils/createCanvasZoomStore";
import { useConstant } from "../../foundation/hooks/useConstant";

/**
 * Owns the zoom store the rendering layer reads through
 * `CanvasZoomStoreContext`: one instance for the canvas's lifetime, kept at the
 * zoom the canvas is drawn at.
 *
 * The zoom is written in a layout effect, so a subscriber the change crosses
 * over re-renders before the paint that shows the new viewBox.
 *
 * @param zoom - The camera's zoom, as the SVG is drawn at it on this render
 */
export const useCanvasZoomStore = (zoom: number): WritableCanvasZoomStore => {
	const zoomStore = useConstant(() => createCanvasZoomStore(zoom));
	useLayoutEffect(() => {
		zoomStore.setZoom(zoom);
	}, [zoomStore, zoom]);
	return zoomStore;
};

import { useMemo } from "react";

import { useDevicePixelRatio } from "./useDevicePixelRatio";
import type { Viewport } from "../../rendering/Viewport";
import { snapViewportToDevicePixels } from "../utils/snapViewportToDevicePixels";

/**
 * The committed camera moved onto the device pixel grid (see
 * snapViewportToDevicePixels), re-snapped when the device pixel ratio changes.
 *
 * Every layer that positions itself from the camera must take this one, or the
 * SVG and the HTML overlays above it would sit a fraction of a pixel apart.
 */
export const useDevicePixelSnappedViewport = (viewport: Viewport): Viewport => {
	const devicePixelRatio = useDevicePixelRatio();
	return useMemo(
		() => snapViewportToDevicePixels(viewport, devicePixelRatio),
		[viewport, devicePixelRatio],
	);
};

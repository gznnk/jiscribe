import type { Viewport } from "../rendering/Viewport";

/**
 * Viewport a canvas starts at, before anything has been measured or the host's
 * camera applied (see createInitialControllerState).
 *
 * Width/height are a placeholder that useContainerResize replaces with the
 * container's real size in a layout effect, ahead of the first paint. They are
 * non-zero because a framing computed from them (fit-all / fit-width) divides
 * by them.
 */
export const INITIAL_VIEWPORT: Viewport = {
	minX: 0,
	minY: 0,
	width: 1000,
	height: 800,
	zoom: 1,
};

import type { CanvasDriver } from "../../support/CanvasDriver";

/** Float slop, so a value landing exactly on the bound is not read as over it. */
const EPSILON = 1e-6;

/**
 * World units the drawn viewBox is allowed to differ from the exact camera.
 *
 * The camera the scene is drawn with is snapped to the device pixel grid
 * (snapViewportToDevicePixels), so its origin can sit up to half a device pixel
 * from where the arithmetic put it. Zoomed out that is more than half a world
 * unit, which a fixed tolerance would read as the view drifting.
 *
 * @param canvas - Driver, used to read the canvas SVG's CSS width and the ratio
 * @param viewBoxWidth - Width of the viewBox being checked, in world units
 * @returns Half a device pixel in world units, with float slop already added
 */
export async function halfDevicePixelInWorld(
	canvas: CanvasDriver,
	viewBoxWidth: number,
): Promise<number> {
	const { cssWidth, devicePixelRatio } = await canvas.page.evaluate(() => {
		// The canvas is the largest SVG on the page (same rule as getViewBox).
		const widest = [...document.querySelectorAll("svg")].reduce((best, svg) =>
			svg.getBoundingClientRect().width > best.getBoundingClientRect().width
				? svg
				: best,
		);
		return {
			cssWidth: widest.getBoundingClientRect().width,
			devicePixelRatio: window.devicePixelRatio,
		};
	});
	return viewBoxWidth / cssWidth / devicePixelRatio / 2 + EPSILON;
}

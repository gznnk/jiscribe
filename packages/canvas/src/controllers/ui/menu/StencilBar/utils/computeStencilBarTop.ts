/**
 * Distance in px from the top of StencilBarDock's band down to the stencil
 * bar that centres the bar in it, rounded down to a whole pixel: centred on a
 * half pixel, the bar's icons blur.
 *
 * @param bandHeight Height of the band in px.
 * @param barHeight Height of the bar in px, its border included.
 * @returns 0 when the bar is as tall as the band or taller (the bar then
 *   stays at the band's top and scrolls inside), never negative.
 */
export const computeStencilBarTop = (
	bandHeight: number,
	barHeight: number,
): number => Math.max(0, Math.floor((bandHeight - barHeight) / 2));

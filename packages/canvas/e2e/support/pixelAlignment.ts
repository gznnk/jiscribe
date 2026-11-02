import type { Locator } from "@playwright/test";

/** Where a button's icon is drawn on screen, and which button it is in. */
export type IconPosition = { label: string; x: number; y: number };

/**
 * The icons (`svg`s inside buttons) under `container` whose top-left falls
 * between screen pixels. At one device pixel per CSS pixel, the specs' default,
 * such an icon is resampled and drawn blurred.
 *
 * @param container Every element it matches is searched; icons with no size
 *   (hidden) are skipped.
 * @returns Empty when every icon is on a whole pixel; otherwise each icon off
 *   it, labelled with its button's aria-label (or data-action) to read the
 *   failure by.
 */
export function findIconsOffWholePixels(
	container: Locator,
): Promise<IconPosition[]> {
	return container.locator("button svg").evaluateAll((icons) =>
		icons
			.map((icon) => {
				const rect = icon.getBoundingClientRect();
				const button = icon.closest("button");
				return {
					label:
						button?.getAttribute("aria-label") ??
						button?.getAttribute("data-action") ??
						"",
					x: rect.x,
					y: rect.y,
					width: rect.width,
				};
			})
			.filter(
				(icon) =>
					icon.width > 0 &&
					(icon.x !== Math.round(icon.x) || icon.y !== Math.round(icon.y)),
			)
			.map(({ label, x, y }) => ({ label, x, y })),
	);
}

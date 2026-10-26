/**
 * The configuration the canvas mounts with, extracted from index.tsx so it
 * needs neither a Webview nor React.
 */

import type {
	Camera,
	CanvasConfig,
	CanvasSidebarsState,
} from "@jiscribe/canvas";
import { standardDefaultPinnedCategoryIds } from "@jiscribe/standard-shapes";

/**
 * Build the canvas's mount-time configuration once the Extension's
 * `pinnedCategories` message has arrived.
 *
 * @param baseConfig - the configuration every mount shares (the plugins);
 *   copied, never modified
 * @param restoredView - the camera and sidebar state from the Webview's
 *   persisted state, each undefined on a first open (the canvas then uses its
 *   own defaults)
 * @param storedPinnedCategoryIds - the message's `pinnedCategoryIds`: null when
 *   the user has none stored, which starts from
 *   `standardDefaultPinnedCategoryIds`; an empty array is kept as the user's
 *   choice to pin nothing
 */
export function buildCanvasMountConfig(
	baseConfig: CanvasConfig,
	restoredView: {
		viewport: Camera | undefined;
		sidebars: CanvasSidebarsState | undefined;
	},
	storedPinnedCategoryIds: string[] | null,
): CanvasConfig {
	return {
		...baseConfig,
		viewport: restoredView.viewport,
		sidebars: restoredView.sidebars,
		pinnedCategoryIds:
			storedPinnedCategoryIds ?? standardDefaultPinnedCategoryIds,
	};
}

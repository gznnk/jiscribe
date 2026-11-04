import type * as CanvasModule from "@jiscribe/canvas";
import type { JSHandle, Page } from "@playwright/test";

/** The globals mountPluginHarness publishes the default page's canvas on. */
type HarnessWindow = {
	__canvasHandle?: CanvasModule.CanvasHandle | null;
	__setHarnessDoc?: (docText: string) => void;
};

/**
 * Replaces the harness canvas's document.
 *
 * @param page - A page showing the plugin harness
 * @param docText - The `.jis` JSON to load, parsed with the harness's plugins
 */
export const loadHarnessDoc = async (
	page: Page,
	docText: string,
): Promise<void> => {
	await page.evaluate((json) => {
		const hook = (window as unknown as HarnessWindow).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(json);
	}, docText);
};

/**
 * The live handle of the harness canvas, for page-side calls to run on.
 *
 * @param page - A page showing the plugin harness
 */
export const readCanvasHandle = (
	page: Page,
): Promise<JSHandle<CanvasModule.CanvasHandle>> =>
	page.evaluateHandle(() => {
		const handle = (window as unknown as HarnessWindow).__canvasHandle;
		if (!handle) {
			throw new Error(
				"__canvasHandle is undefined (harness hook not installed)",
			);
		}
		return handle;
	});

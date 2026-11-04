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

/** The boxes a drawn body is laid out in, in the overlay's own CSS px. */
export type DrawnBodyBox = {
	/** `scrollWidth` / `scrollHeight` of the content element: the body's full extent, clipped or not. */
	scrollWidth: number;
	scrollHeight: number;
	/** The wrapper's `clientWidth` / `clientHeight`: the region the body is clipped to (`overflow: hidden`). */
	regionWidth: number;
	regionHeight: number;
};

/**
 * Reads the content element the canvas draws a shape's body in
 * (`foreignObject > wrapper > content`, the structure TextOverlayFrame
 * documents), as the browser laid it out on screen — what a measurement taken
 * off screen is compared against.
 *
 * @param page - A page showing the plugin harness
 * @param id - The shape whose overlay is read; null when it draws no body yet
 */
export const readDrawnBodyBox = (
	page: Page,
	id: string,
): Promise<DrawnBodyBox | null> =>
	page.evaluate((targetId) => {
		const shape = document.querySelector(`[data-id="${targetId}"]`);
		let sibling = shape?.nextElementSibling ?? null;
		// The overlay is either a sibling of its own or inside the group
		// createFrameObject draws every overlay of a shape in.
		while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
			const nested: Element | null = sibling.hasAttribute("data-id")
				? null
				: sibling.querySelector("foreignObject");
			sibling = nested ?? sibling.nextElementSibling;
		}
		const wrapper = sibling?.firstElementChild ?? null;
		const content = wrapper?.firstElementChild ?? null;
		if (
			!(wrapper instanceof HTMLElement) ||
			!(content instanceof HTMLElement)
		) {
			return null;
		}
		// The content grows with the body; the wrapper is what clips it.
		return {
			scrollWidth: content.scrollWidth,
			scrollHeight: content.scrollHeight,
			regionWidth: wrapper.clientWidth,
			regionHeight: wrapper.clientHeight,
		};
	}, id);

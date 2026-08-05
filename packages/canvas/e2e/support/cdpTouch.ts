import type { CDPSession, Page } from "@playwright/test";

/**
 * CDP-based multi-touch driving, shared by the touch specs. Playwright's
 * mouse/touchscreen API cannot do multi-touch, so real touch points are sent
 * through CDP's Input.dispatchTouchEvent.
 *
 * CDP touch caveats the callers are built around:
 * - touchStart/touchMove take every currently active touch point (told apart by id).
 * - touchEnd takes the points to release ([] releases all the remaining ones).
 * - Once capture is established the second and later touchMove of the same finger
 *   has no effect, so each finger is moved to its final position in one touchMove.
 */

export type TouchPoint = { x: number; y: number; id: number };

/** Advances two RAF frames to drain the GestureRecognizer queue (schedule's one-shot RAF). */
export function flushFrames(page: Page) {
	return page.evaluate(
		() =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			),
	);
}

export function dispatchTouch(
	client: CDPSession,
	type: "touchStart" | "touchMove" | "touchEnd",
	touchPoints: TouchPoint[],
) {
	return client.send("Input.dispatchTouchEvent", { type, touchPoints });
}

/**
 * Enable touch emulation on a fresh CDP session. Touch interferes with driving
 * the tools by real mouse, so call this only after any mouse-driven setup.
 */
export async function enableTouch(page: Page): Promise<CDPSession> {
	const client = await page.context().newCDPSession(page);
	await client.send("Emulation.setTouchEmulationEnabled", {
		enabled: true,
		maxTouchPoints: 5,
	});
	return client;
}

/**
 * The viewBox string as numbers: [minX, minY, width, height] (world units).
 *
 * @param viewBox - CanvasDriver.getViewBox() result; null (canvas not found) throws.
 */
export function parseViewBox(viewBox: string | null): number[] {
	if (viewBox === null) {
		throw new Error("viewBox is not available");
	}
	return viewBox.split(" ").map(Number);
}

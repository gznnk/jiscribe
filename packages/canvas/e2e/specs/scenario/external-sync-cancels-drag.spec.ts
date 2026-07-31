import { test, expect } from "../../fixtures";

/**
 * External sync (SYNC_EXTERNAL) must cancel a drag that is in progress (#78).
 *
 * useSyncExternalDoc calls resetGestureState when the external doc is swapped,
 * and that is contracted to discard the GestureRecognizer's in-flight drag. In
 * #78 StrictMode's setup->cleanup->setup left the recognizer ref null, making
 * the reset a permanent no-op; the harness runs on StrictMode plus the dev
 * server, so this spec detects that regression together with its environment.
 *
 * Pan (middle-button drag) is what makes the difference observable: the pan drag
 * handler falls back to the current viewport even when eventStartSnapshot is
 * gone (CanvasEventHandler), so a reset that does not take effect shows up as
 * "panning continues after the sync". A shape drag returns early on the missing
 * snapshot and looks identical either way, so it cannot tell the two apart.
 */

const syncedDocText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "synced-rect",
			type: "rect",
			x: 300,
			y: 200,
			width: 160,
			height: 100,
		},
	],
});

test.describe("drag cancellation on external sync (#78)", () => {
	test("stops panning on later pointer moves when the external doc is swapped mid-pan", async ({
		canvas,
	}) => {
		const { page } = canvas;

		// Gesture handling is batched on RAF, so "nothing moved" is checked by flushing
		// two frames explicitly and then reading, rather than by waiting on a timer.
		const flushFrames = () =>
			page.evaluate(
				() =>
					new Promise<void>((resolve) => {
						requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
					}),
			);

		// Start a middle-button pan and hold it without releasing.
		const viewBoxBeforePan = await canvas.getViewBox();
		const grabScreen = canvas.toScreen({ x: 500, y: 300 });
		await page.mouse.move(grabScreen.x, grabScreen.y);
		await page.mouse.down({ button: "middle" });
		await page.mouse.move(grabScreen.x + 120, grabScreen.y + 80, { steps: 8 });

		// Positive control: the pan really started. Without it the rest is vacuous.
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "the middle drag starts a pan",
			})
			.not.toBe(viewBoxBeforePan);

		// Inject the external doc while the drag is held: SYNC_EXTERNAL + resetGestureState.
		await page.evaluate((docText) => {
			const hook = (
				window as unknown as {
					__setHarnessDoc?: (docText: string) => void;
				}
			).__setHarnessDoc;
			if (!hook) {
				throw new Error(
					"__setHarnessDoc is undefined (harness hook not installed)",
				);
			}
			hook(docText);
		}, syncedDocText);
		// Only continue once the sync landed, i.e. the injected shape showed up.
		await expect(canvas.objectById("synced-rect")).toHaveCount(1);

		// The drag should be cancelled: even a much larger pointer move leaves the
		// viewBox alone. If the reset is a no-op the pan continues and this fails.
		await flushFrames();
		const viewBoxAfterSync = await canvas.getViewBox();
		await page.mouse.move(grabScreen.x + 400, grabScreen.y + 300, {
			steps: 8,
		});
		await flushFrames();
		expect(await canvas.getViewBox()).toBe(viewBoxAfterSync);

		await page.mouse.up({ button: "middle" });
	});
});

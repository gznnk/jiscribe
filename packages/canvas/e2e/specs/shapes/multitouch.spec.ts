import type { CDPSession, Page } from "@playwright/test";

import { test, expect } from "../../fixtures";

/**
 * Non-regression test for issue #25 "GestureRecognizer - state pollution on multi-touch".
 *
 * GestureRecognizer holds a single pointer (pressed), so a second pointerdown
 * interrupting the first gesture overwrote it and every later event from the
 * first pointer was dropped on a pointerId mismatch. Shapes froze in an
 * intermediate state and risked committing the wrong coordinates. After the fix,
 * a second or later pointerdown during an active gesture is simply ignored.
 *
 * Playwright's mouse/touchscreen API cannot do multi-touch, so two real touch
 * points are sent at once through CDP's Input.dispatchTouchEvent.
 *
 * CDP touch caveats this test is built around:
 * - touchStart/touchMove take every currently active touch point (told apart by id).
 * - touchEnd takes the points to release ([] releases all the remaining ones).
 * - Once capture is established the second and later touchMove of the same finger
 *   has no effect, so each finger is moved to its final position in one touchMove.
 */

type TouchPoint = { x: number; y: number; id: number };

/** Advances two RAF frames to drain the GestureRecognizer queue (schedule's one-shot RAF). */
function flushFrames(page: Page) {
	return page.evaluate(
		() =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			),
	);
}

function dispatchTouch(
	client: CDPSession,
	type: "touchStart" | "touchMove" | "touchEnd",
	touchPoints: TouchPoint[],
) {
	return client.send("Input.dispatchTouchEvent", { type, touchPoints });
}

// Empty spot well clear of the shape (content coordinates), used as the second touch's landing point.
const SECOND_FINGER = { x: 150, y: 780, id: 2 } as const;
const FIRST_FINGER_ID = 1;

test.describe("state pollution on multi-touch (issue #25)", () => {
	test("keeps moving the shape with the first finger when a second touch interrupts the drag", async ({
		canvas,
		page,
	}) => {
		// Rect centered at (500, 260)
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		// Touch interferes with driving the tools by real mouse, so enable it after drawing
		const client = await page.context().newCDPSession(page);
		await client.send("Emulation.setTouchEmulationEnabled", {
			enabled: true,
			maxTouchPoints: 5,
		});

		// CDP takes raw screen coordinates, so content coordinates are converted before sending.
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });

		// First finger: press on the shape's center
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);

		// Second finger: press the distant empty spot at the same time (the multi-touch interruption)
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
			tp({ ...SECOND_FINGER }),
		]);
		await flushFrames(page);

		// Drag the first finger to its final position (800, 560).
		// In the old implementation the second pointerdown overwrote pressed, the first
		// finger's moves were dropped on a pointerId mismatch and the shape stayed
		// frozen at its center, committing an intermediate state.
		await dispatchTouch(client, "touchMove", [
			tp({ x: 800, y: 560, id: FIRST_FINGER_ID }),
			tp({ ...SECOND_FINGER }),
		]);
		await flushFrames(page);

		await expect
			.poll(
				async () =>
					(await canvas.captureObjects()).find((obj) => obj.id === id)
						?.transform,
				{
					message:
						"the second finger's interruption is ignored and the first carries the shape to its final position",
				},
			)
			.toBe("matrix(1, 0, 0, 1, 800, 560)");

		// Release both fingers to end the gesture and confirm it commits at the final position
		await dispatchTouch(client, "touchEnd", [tp({ ...SECOND_FINGER })]);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);

		expect(
			(await canvas.captureObjects()).find((obj) => obj.id === id)?.transform,
		).toBe("matrix(1, 0, 0, 1, 800, 560)");
	});

	test("keeps the first finger's gesture alive when a second finger taps and releases during the press", async ({
		canvas,
		page,
	}) => {
		// Rect centered at (500, 260)
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		const client = await page.context().newCDPSession(page);
		await client.send("Emulation.setTouchEmulationEnabled", {
			enabled: true,
			maxTouchPoints: 5,
		});

		// CDP takes raw screen coordinates, so content coordinates are converted before sending.
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });

		// First finger: hold the press on the shape's center
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);

		// Second finger: interrupt with a tap on empty space (press and release)
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
			tp({ ...SECOND_FINGER }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchEnd", [tp({ ...SECOND_FINGER })]);
		await flushFrames(page);

		// Drag the first finger to its final position.
		// In the old implementation the second finger stole pressed and its touchEnd
		// then cleared it, so the first finger's moves were ignored and the shape
		// did not move at all.
		await dispatchTouch(client, "touchMove", [
			tp({ x: 800, y: 560, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);

		await expect
			.poll(
				async () =>
					(await canvas.captureObjects()).find((obj) => obj.id === id)
						?.transform,
				{
					message:
						"the first finger's gesture survives the second finger's tap and still moves the shape",
				},
			)
			.toBe("matrix(1, 0, 0, 1, 800, 560)");

		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);
	});
});

import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Document-editing shortcuts around a move drag.
 *
 * - Pressed while the button is still held, they are refused: every drag frame is
 *   rebuilt from the drag's start snapshot, so their change would be thrown away
 *   on screen while their history entry stayed. One undo after the release takes
 *   back the move and nothing else.
 * - Pressed in the frame the drag is released, they are applied: pointer input is
 *   processed on the next animation frame while a key is handled at once, so the
 *   shortcut has to drain the pending release first instead of being refused as if
 *   the drag were still under way.
 *
 * Paste is left out of the mid-drag set: its clipboard read is async, so whether
 * the refusal or the release reaches the reducer first is not under the test's
 * control.
 */

/** 240 x 180 rect centered at (520, 270). */
const RECT_FROM = { x: 400, y: 180 };
const RECT_TO = { x: 640, y: 360 };
const RECT_CENTER_TRANSFORM = "matrix(1, 0, 0, 1, 520, 270)";

/** Grabbed inside the rect but clear of its text and its handles; moved by (+100, +100). */
const GRAB_FROM = { x: 450, y: 210 };
const GRAB_TO = { x: 550, y: 310 };
const MOVED_TRANSFORM = "matrix(1, 0, 0, 1, 620, 370)";

const undoButton = selectors.toolbarCommand("undo");

/** Draws the rect with a text body and leaves it selected, for the Bold shortcut to act on. */
async function drawLabeledRect(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
	await canvas.typeTextAt({ x: 520, y: 270 }, "Label");
	await canvas.commitText();
	// commitText clicks empty space and deselects.
	await canvas.selectAt({ x: 520, y: 270 });
	return id;
}

/** Waits until the move drag has hidden the transform frame, i.e. the drag is under way. */
async function expectMoveDragActive(canvas: CanvasDriver) {
	await expect(
		canvas.page.locator(selectors.transformControl("topLeft")),
	).toHaveCount(0);
}

/**
 * Holds every animation frame callback requested from here on instead of running it,
 * so pointer input queued for the next frame stays queued while the test presses a
 * key: the "same frame" a release and a shortcut can share, made deterministic.
 * Records how many callbacks were held when the given key went down, which is what
 * shows the window was really exercised.
 */
async function holdAnimationFrames(page: Page, keyCode: string) {
	await page.evaluate((watchedKeyCode) => {
		const requestOriginal = window.requestAnimationFrame.bind(window);
		const cancelOriginal = window.cancelAnimationFrame.bind(window);
		const heldCallbacks = new Map<number, FrameRequestCallback>();
		// Negative so a held id can never collide with one the browser issued.
		let nextHeldId = -1;
		const frameHold = {
			heldAtKeydown: -1,
			release: () => {
				window.requestAnimationFrame = requestOriginal;
				window.cancelAnimationFrame = cancelOriginal;
				heldCallbacks.forEach((callback) => requestOriginal(callback));
				heldCallbacks.clear();
			},
		};
		window.requestAnimationFrame = (callback) => {
			const heldId = nextHeldId--;
			heldCallbacks.set(heldId, callback);
			return heldId;
		};
		window.cancelAnimationFrame = (requestId) => {
			if (!heldCallbacks.delete(requestId)) {
				cancelOriginal(requestId);
			}
		};
		// Capture phase on window, so it reads the queue before the canvas handles the key.
		window.addEventListener(
			"keydown",
			(event) => {
				if (event.code === watchedKeyCode && frameHold.heldAtKeydown < 0) {
					frameHold.heldAtKeydown = heldCallbacks.size;
				}
			},
			{ capture: true },
		);
		Reflect.set(window, "__frameHold", frameHold);
	}, keyCode);
}

/**
 * Restores requestAnimationFrame and runs what was held on the next real frame.
 *
 * @returns How many callbacks were held when the watched key went down; -1 if it never did
 */
async function releaseAnimationFrames(page: Page): Promise<number> {
	return page.evaluate(() => {
		const frameHold = Reflect.get(window, "__frameHold") as
			{ heldAtKeydown: number; release: () => void } | undefined;
		frameHold?.release();
		return frameHold?.heldAtKeydown ?? -1;
	});
}

/** Resolves after two animation frames, so every pointer event sent so far has been processed. */
async function waitTwoFrames(page: Page) {
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
			}),
	);
}

test.describe("keyboard: shortcuts around a drag", () => {
	test("refuses Delete, Ctrl+D and an arrow nudge mid-drag and leaves only the move in the history", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			RECT_CENTER_TRANSFORM,
		);

		await canvas.dragInspecting(GRAB_FROM, GRAB_TO, async () => {
			await expectMoveDragActive(canvas);
			await canvas.page.keyboard.press("Delete");
			await canvas.page.keyboard.press("Control+d");
			await canvas.page.keyboard.press("ArrowRight");
		});

		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "the drag lands exactly, with no nudge on top",
			})
			.toBe(MOVED_TRANSFORM);
		expect(
			(await canvas.captureObjects()).map((obj) => obj.id),
			"neither deleted nor duplicated",
		).toEqual([id]);

		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "one undo takes back the move",
			})
			.toBe(RECT_CENTER_TRANSFORM);

		// Drawing is the only entry left: a refused command that had still committed
		// would be another one standing between it and an empty history.
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);
		await expect(canvas.page.locator(undoButton)).toBeDisabled();
	});

	test("refuses Ctrl+B mid-drag, so one undo after the release restores the text as it was", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);
		expect((await canvas.textStyleOf(id))?.fontWeight).toBe("400");

		await canvas.dragInspecting(GRAB_FROM, GRAB_TO, async () => {
			await expectMoveDragActive(canvas);
			await canvas.page.keyboard.press("Control+b");
		});

		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe(MOVED_TRANSFORM);
		expect((await canvas.textStyleOf(id))?.fontWeight).toBe("400");

		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "one undo takes back the move, not a Bold left in the history",
			})
			.toBe(RECT_CENTER_TRANSFORM);
		expect((await canvas.textStyleOf(id))?.fontWeight).toBe("400");
		expect(
			await canvas.page.evaluate(() => document.body.textContent),
		).toContain("Label");
	});

	test("applies Ctrl+B pressed in the same frame as the drag's release", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);
		expect((await canvas.textStyleOf(id))?.fontWeight).toBe("400");

		await canvas.dragInspecting(GRAB_FROM, GRAB_TO, async () => {
			await expectMoveDragActive(canvas);
			// Let the moves so far run, so the release is the batch left waiting.
			await waitTwoFrames(canvas.page);
			await holdAnimationFrames(canvas.page, "KeyB");
		});
		let heldAtKeydown = -1;
		try {
			// No wait after the release: its batch is still held for the next frame.
			await canvas.page.keyboard.press("Control+b");
		} finally {
			heldAtKeydown = await releaseAnimationFrames(canvas.page);
		}
		expect(
			heldAtKeydown,
			"the release was still waiting for its frame when the key went down",
		).toBeGreaterThan(0);

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontWeight, {
				message: "the Bold pressed with the release is applied, not dropped",
			})
			.toBe("700");
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			MOVED_TRANSFORM,
		);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Styling a stretch of a shape's text rather than the whole slot: the editor
 * reports what it has selected, the bold / italic / underline keystrokes apply to
 * that stretch, and the text is drawn as the runs it is now styled in.
 *
 * The keystrokes are handled by the editing surface itself (it holds the focus,
 * and they are the browser's own defaults on an editable element), so they are
 * exercised through the real editor rather than through the ObjectMenu.
 */
test.describe("styling a stretch of a shape's text", () => {
	const SHAPE_CENTER = { x: 520, y: 270 };

	/** Draws a rect and puts `text` in it, leaving the editor open. */
	async function drawAndEdit(
		canvas: CanvasDriver,
		text: string,
	): Promise<string> {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 180 },
			{ x: 640, y: 360 },
		);
		await canvas.typeTextAt(SHAPE_CENTER, text);
		return id;
	}

	/** Selects the first `length` characters of the open editor. */
	async function selectFromStart(canvas: CanvasDriver, length: number) {
		await canvas.page.keyboard.press("Home");
		for (let i = 0; i < length; i++) {
			await canvas.page.keyboard.press("Shift+ArrowRight");
		}
	}

	/**
	 * The box the open editor lays its selection out in, beside the box of the run
	 * it covers. The two agree only while the editor draws the styled text itself:
	 * a surface laid out in the slot's own typography would highlight the width the
	 * unstyled text takes (issue #7).
	 */
	async function selectionAndRunBoxes(canvas: CanvasDriver): Promise<{
		run: { height: number; width: number };
		selection: { height: number; width: number };
	} | null> {
		return canvas.page.evaluate(() => {
			const surface = document.querySelector(
				'[data-testid="text-editor"] [contenteditable="true"]',
			);
			const run = surface?.querySelector("span") ?? null;
			const selection = document.getSelection();
			if (!run || !selection || selection.rangeCount === 0) {
				return null;
			}
			const runBox = run.getBoundingClientRect();
			const selectionBox = selection.getRangeAt(0).getBoundingClientRect();
			return {
				run: { height: runBox.height, width: runBox.width },
				selection: { height: selectionBox.height, width: selectionBox.width },
			};
		});
	}

	/**
	 * The size the open editor draws the first character at, read off the element
	 * that lays it out rather than off the surface: what is drawn diverges from the
	 * runs exactly when the browser wraps the character in an element of its own.
	 */
	async function drawnFontSizeOfFirstCharacter(
		canvas: CanvasDriver,
	): Promise<string | null> {
		return canvas.page.evaluate(() => {
			const surface = document.querySelector(
				'[data-testid="text-editor"] [contenteditable="true"]',
			);
			if (!surface) {
				return null;
			}
			const firstText = document
				.createTreeWalker(surface, NodeFilter.SHOW_TEXT)
				.nextNode();
			const holder = firstText?.parentElement;
			return holder ? getComputedStyle(holder).fontSize : null;
		});
	}

	test("reopens the editor on the styled text, caret and selection included", async ({
		canvas,
	}) => {
		const id = await drawAndEdit(canvas, "Payment failed");
		await selectFromStart(canvas, 7);
		// Type size is only reachable from the menu; the keystrokes cover bold,
		// italic and underline alone.
		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id))[0]?.fontSize)
			.toBe("40px");
		await canvas.commitText();

		// Editing it again: the surface has to lay the first word out at 40px, or the
		// caret, the selection and the wrapping all sit where an unstyled copy of the
		// text would be.
		await canvas.typeTextAt(SHAPE_CENTER, "");
		expect(await canvas.drawnTextRuns(id)).toEqual([
			expect.objectContaining({ text: "Payment", fontSize: "40px" }),
			expect.objectContaining({ text: " failed", fontSize: "16px" }),
		]);

		await selectFromStart(canvas, 7);
		const boxes = await selectionAndRunBoxes(canvas);
		expect(boxes).not.toBeNull();
		// The highlight covers exactly the run it selects, at its size.
		expect(
			Math.abs((boxes?.selection.width ?? 0) - (boxes?.run.width ?? 0)),
		).toBeLessThanOrEqual(2);
		expect(boxes?.selection.height ?? 0).toBeGreaterThanOrEqual(
			(boxes?.run.height ?? 0) - 2,
		);

		// Typing on top of that still reaches the editing state, styling intact.
		await canvas.page.keyboard.press("End");
		await canvas.page.keyboard.type(" twice");
		expect(await canvas.textEditorText()).toBe("Payment failed twice");
		await canvas.commitText();
		expect(await canvas.drawnTextRuns(id)).toEqual([
			expect.objectContaining({ text: "Payment", fontSize: "40px" }),
			expect.objectContaining({ text: " failed twice", fontSize: "16px" }),
		]);
	});

	test("bolds only the selected characters and keeps them bold after the commit", async ({
		canvas,
	}) => {
		const id = await drawAndEdit(canvas, "Payment failed");
		await selectFromStart(canvas, 7);

		await canvas.page.keyboard.press("ControlOrMeta+b");

		// The editor draws the runs itself while it is open, so the styling shows
		// right away.
		await expect
			.poll(async () => await canvas.drawnTextRuns(id))
			.toEqual([
				expect.objectContaining({ text: "Payment", fontWeight: "700" }),
				expect.objectContaining({ text: " failed", fontWeight: "400" }),
			]);

		await canvas.commitText();
		expect(await canvas.drawnTextRuns(id)).toEqual([
			expect.objectContaining({ text: "Payment", fontWeight: "700" }),
			expect.objectContaining({ text: " failed", fontWeight: "400" }),
		]);
	});

	test("makes the keystroke its own undo entry, taken back without the text", async ({
		canvas,
	}) => {
		const id = await drawAndEdit(canvas, "Payment failed");
		await canvas.commitText();

		// One press is one commit — the styling does not ride on the commit that
		// ends the edit, so it comes back off on its own.
		await canvas.typeTextAt(SHAPE_CENTER, "");
		await selectFromStart(canvas, 7);
		await canvas.page.keyboard.press("ControlOrMeta+b");
		await canvas.commitText();
		expect((await canvas.drawnTextRuns(id))[0]?.fontWeight).toBe("700");

		await canvas.undo();
		await expect
			.poll(async () => await canvas.drawnTextRuns(id))
			.toEqual([
				expect.objectContaining({ text: "Payment failed", fontWeight: "400" }),
			]);
	});

	test("turns the styling back off on a second press, leaving one plain text", async ({
		canvas,
	}) => {
		const id = await drawAndEdit(canvas, "Payment failed");
		await selectFromStart(canvas, 7);

		await canvas.page.keyboard.press("ControlOrMeta+i");
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id))[0]?.fontStyle)
			.toBe("italic");

		await canvas.page.keyboard.press("ControlOrMeta+i");
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id))[0]?.fontStyle)
			.toBe("normal");
	});

	// Deleting a run whole leaves Chrome typing in that run's style again, in an
	// element of its own: for a size override a bare <span style="font-size: …">,
	// which the editor has to tell from the spans it draws its own runs with. Left
	// standing, it draws the typed text in a style the runs no longer carry.
	test("drops the style Chrome revives when a run is deleted whole", async ({
		canvas,
	}) => {
		const id = await drawAndEdit(canvas, "Payment failed");
		await selectFromStart(canvas, 7);
		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id))[0]?.fontSize)
			.toBe("40px");
		await canvas.commitText();

		// The whole 40px run, deleted and then typed over.
		await canvas.typeTextAt(SHAPE_CENTER, "");
		await selectFromStart(canvas, 7);
		await canvas.page.keyboard.press("Backspace");
		await canvas.page.keyboard.type("R");

		// The typed character carries no size of its own, so the editor has to draw
		// it in the slot's, as the committed text is drawn below.
		await expect.poll(() => drawnFontSizeOfFirstCharacter(canvas)).toBe("16px");
		await canvas.commitText();
		expect(await canvas.drawnTextRuns(id)).toEqual([
			expect.objectContaining({ text: "R failed", fontSize: "16px" }),
		]);
	});

	test("keeps the styling the browser draws when typing over a styled selection", async ({
		canvas,
	}) => {
		const id = await drawAndEdit(canvas, "Payment failed");
		await selectFromStart(canvas, 7);
		await canvas.page.keyboard.press("ControlOrMeta+b");
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).length)
			.toBe(2);

		// Typing over the still-selected stretch: Chrome draws the replacement in
		// the styling the stretch began with, and the commit has to keep it.
		await canvas.page.keyboard.type("Refund");
		await canvas.commitText();

		expect(await canvas.drawnTextRuns(id)).toEqual([
			expect.objectContaining({ text: "Refund", fontWeight: "700" }),
			expect.objectContaining({ text: " failed", fontWeight: "400" }),
		]);
	});

	test("keeps the styling on the characters an edit leaves in place", async ({
		canvas,
	}) => {
		const id = await drawAndEdit(canvas, "Payment failed");
		await selectFromStart(canvas, 7);
		await canvas.page.keyboard.press("ControlOrMeta+b");
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).length)
			.toBe(2);

		// Typing at the end of the text must not disturb the styled part.
		await canvas.page.keyboard.press("End");
		await canvas.page.keyboard.type(" twice");
		await canvas.commitText();

		expect(await canvas.drawnTextRuns(id)).toEqual([
			expect.objectContaining({ text: "Payment", fontWeight: "700" }),
			expect.objectContaining({ text: " failed twice", fontWeight: "400" }),
		]);
	});
});

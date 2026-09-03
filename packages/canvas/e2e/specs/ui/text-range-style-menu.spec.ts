import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Styling a stretch of the text being edited from the ObjectMenu. The menu used
 * to be hidden while an editor was open; it now stays, narrowed to the text items,
 * because the color and the size of a run live nowhere else — the keystrokes only
 * cover bold / italic / underline (see text-range-style.spec.ts).
 *
 * What has to hold for that to work: the menu press neither commits the edit nor
 * takes the focus off the editing surface, so the selection it styles is still
 * there afterwards. The font size is the exception — its input and slider need the
 * focus themselves — so the editor takes it back once they are done with it.
 */
test.describe("styling a stretch of text from the ObjectMenu", () => {
	const SHAPE_CENTER = { x: 520, y: 270 };

	/** Draws a rect, puts `text` in it, and selects its first `length` characters. */
	async function editAndSelect(
		canvas: CanvasDriver,
		text: string,
		length: number,
	): Promise<string> {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 180 },
			{ x: 640, y: 360 },
		);
		await canvas.typeTextAt(SHAPE_CENTER, text);
		await canvas.page.keyboard.press("Home");
		for (let i = 0; i < length; i++) {
			await canvas.page.keyboard.press("Shift+ArrowRight");
		}
		return id;
	}

	test("shows the menu while a shape's text is edited, narrowed to the text items", async ({
		canvas,
	}) => {
		await editAndSelect(canvas, "Payment failed", 7);

		await expect(canvas.page.locator(selectors.objectMenu)).toBeVisible();
		// The text items are there; the object-level ones are not, since reshaping
		// or restacking the shape is not what the menu is open for.
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("font-size")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("stack-order")),
		).toHaveCount(0);
	});

	test("colors only the selected characters, leaving the editor open", async ({
		canvas,
	}) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);

		await canvas.setColor("font-color", "#e11d48");

		const expectedColor = await canvas.normalizeColor("#e11d48");
		await expect
			.poll(async () => await canvas.drawnTextRuns(id))
			.toEqual([
				expect.objectContaining({ text: "Payment", color: expectedColor }),
				expect.objectContaining({ text: " failed" }),
			]);
		expect((await canvas.drawnTextRuns(id))[1].color).not.toBe(expectedColor);
		// The session survived the menu interaction.
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
	});

	test("resizes only the selected characters", async ({ canvas }) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);

		await expect
			.poll(async () => (await canvas.drawnTextRuns(id))[0]?.fontSize)
			.toBe("40px");
		expect((await canvas.drawnTextRuns(id))[1].fontSize).not.toBe("40px");
	});

	test("changes the family of only the selected characters", async ({
		canvas,
	}) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);

		await canvas.openObjectMenu("font-family");
		await canvas.page.click(selectors.objectMenuFont("mono"));

		await expect
			.poll(async () => (await canvas.drawnTextRuns(id))[0]?.fontFamily)
			.toContain("Source Code Pro");
		expect((await canvas.drawnTextRuns(id))[1].fontFamily).not.toContain(
			"Source Code Pro",
		);
		// The session survives the menu interaction, as it does for the other items.
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
	});

	test("reads the selection back, so the Bold toggle turns it off again", async ({
		canvas,
	}) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);

		await canvas.setTextFormat("fontWeight", "bold");
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).length)
			.toBe(2);

		// The button now offers the cleared value, which it can only know from the
		// selection's own styling rather than the slot's.
		await canvas.setTextFormat("fontWeight", "normal");
		await expect
			.poll(async () =>
				canvas.page.evaluate(() =>
					document
						.querySelector(
							'[data-id="object-menu"][data-part^="set:fontWeight:"]',
						)
						?.getAttribute("data-part"),
				),
			)
			.toBe("set:fontWeight:bold");
	});

	test("takes the focus back with the same stretch selected once the size is committed", async ({
		canvas,
	}) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);

		// Enter blurs the input, leaving the focus nowhere; the editor takes it back
		// so the session can be typed into again, and the stretch that was styled is
		// selected once more — typing replaces exactly it.
		await expect
			.poll(async () => await canvas.isTextEditorFocused())
			.toBe(true);
		expect(await canvas.textEditorSelection()).toEqual({ start: 0, end: 7 });

		await canvas.page.keyboard.type("Charge");
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).map((run) => run.text))
			.toEqual(["Charge", " failed"]);
	});

	test("takes the focus back when the slider drag that took it ends", async ({
		canvas,
	}) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);

		await canvas.openObjectMenu("font-size");
		await canvas.dragSliderBy("fontSize", 60);

		// The slider gives the focus up on the pointer release rather than holding it
		// until the dropdown closes, so the session has its caret back straight away.
		await expect
			.poll(async () => await canvas.isTextEditorFocused())
			.toBe(true);
		expect(await canvas.textEditorSelection()).toEqual({ start: 0, end: 7 });

		await canvas.page.keyboard.type("Charge");
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).map((run) => run.text))
			.toEqual(["Charge", " failed"]);
	});

	test("leaves one undo entry behind a slider drag, not one per frame", async ({
		canvas,
	}) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);
		// The text lands in its own undo entry, so the one the drag leaves is the
		// only thing between here and the committed text.
		await canvas.commitText();
		const plain = (await canvas.drawnTextRuns(id))[0]?.fontSize;

		// Reopen on the same stretch. The per-range write goes through the same
		// property path as every other menu change, whose drag frames are previews:
		// a commit inside that write would record each frame, and undoing the drag
		// would take one press per frame it happened to produce.
		await canvas.typeTextAt(SHAPE_CENTER, "");
		await canvas.page.keyboard.press("Home");
		for (let i = 0; i < 7; i++) {
			await canvas.page.keyboard.press("Shift+ArrowRight");
		}
		await canvas.openObjectMenu("font-size");
		await canvas.dragSliderBy("fontSize", 60);
		await canvas.commitText();
		expect((await canvas.drawnTextRuns(id))[0]?.fontSize).not.toBe(plain);

		await canvas.undo();
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).map((run) => run.text))
			.toEqual(["Payment failed"]);
		expect((await canvas.drawnTextRuns(id))[0]?.fontSize).toBe(plain);
	});
});

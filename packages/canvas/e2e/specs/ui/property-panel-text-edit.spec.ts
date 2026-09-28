import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Styling a stretch of the text being edited from the properties sidebar. While
 * the sidebar is open it takes the ObjectMenu's place, so it has to keep the
 * edit going the way the menu does (text-range-style-menu.spec.ts): a press on
 * one of its controls leaves the focus on the editing surface, and the Size
 * field, which takes the focus to be typed into, hands it back once committed.
 * Otherwise the style lands but the caret and the highlighted stretch go, and
 * the next keystroke reaches nothing.
 */

const PANEL = selectors.propertyPanel;
const SHAPE_CENTER = { x: 520, y: 270 };
const SELECTED = { start: 0, end: 7 };

/** Draws a rect, opens the sidebar, puts `text` in the rect and selects its first `length` characters. */
async function editAndSelect(
	canvas: CanvasDriver,
	text: string,
	length: number,
): Promise<string> {
	await canvas.openPropertyPanel();
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

/** Asserts the edit is still open with the focus and the selected stretch where they were. */
async function expectEditKept(canvas: CanvasDriver, step: string) {
	await expect(canvas.page.locator(selectors.textEditor), step).toHaveCount(1);
	await expect
		.poll(async () => await canvas.isTextEditorFocused(), { message: step })
		.toBe(true);
	expect(await canvas.textEditorSelection(), step).toEqual(SELECTED);
}

test.describe("styling a stretch of text from the properties sidebar", () => {
	test("keeps the edit focused and the stretch selected through every text control", async ({
		canvas,
	}) => {
		const id = await editAndSelect(canvas, "Payment failed", 7);
		// The sidebar stands in for the ObjectMenu, which is not drawn beside it.
		await expect(canvas.page.locator(selectors.objectMenu)).toHaveCount(0);

		await canvas.page.click(`${PANEL} [aria-label="Bold"]`);
		await expectEditKept(canvas, "after Bold");

		await canvas.page.click(selectors.propertyPanelSet("textAlign", "center"));
		await expectEditKept(canvas, "after the Horizontal segment");

		await canvas.page.click(`${PANEL} [aria-label="Font Color"]`);
		await expectEditKept(canvas, "after opening the color dropdown");
		await canvas.page.click(selectors.propertyPanelSet("fontColor", "#dc2626"));
		await expectEditKept(canvas, "after the color swatch");

		await canvas.page.click(`${PANEL} [aria-label="Font"]`);
		await expectEditKept(canvas, "after opening the font dropdown");
		await canvas.page.click(`${PANEL} [data-font="mono"]`);
		await expectEditKept(canvas, "after the font choice");

		// The field takes the focus to be typed into; Enter gives it up, and the
		// editor takes it back with the same stretch selected.
		const fontSize = canvas.page.locator(
			selectors.propertyPanelField("fontSize"),
		);
		await fontSize.fill("40");
		await fontSize.press("Enter");
		await expectEditKept(canvas, "after the Size field's Enter");

		const [styled] = await canvas.drawnTextRuns(id);
		expect(styled).toMatchObject({
			text: "Payment",
			fontWeight: "700",
			fontSize: "40px",
			color: await canvas.normalizeColor("#dc2626"),
		});

		// Typing replaces exactly the stretch, in the style it now carries.
		await canvas.page.keyboard.type("Charge");
		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).map((run) => run.text))
			.toEqual(["Charge", " failed"]);
		expect((await canvas.drawnTextRuns(id))[0]).toMatchObject({
			fontWeight: "700",
			fontSize: "40px",
		});
	});

	test("still ends the edit on a press on the canvas", async ({ canvas }) => {
		await editAndSelect(canvas, "Payment failed", 7);
		await canvas.page.click(`${PANEL} [aria-label="Bold"]`);
		await expectEditKept(canvas, "after Bold");

		// Only the sidebar is kept from taking the focus; the canvas outside it
		// behaves as it always did.
		await canvas.commitText();
		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Content-box top and height of an element, in viewport px. The two text boxes
 * carry the same padding, so comparing content boxes compares where the first
 * line actually starts.
 */
async function contentBoxOf(
	locator: ReturnType<CanvasDriver["page"]["locator"]>,
): Promise<{ top: number; height: number }> {
	return locator.evaluate((el) => {
		const rect = el.getBoundingClientRect();
		const style = getComputedStyle(el);
		const paddingTop = parseFloat(style.paddingTop);
		return {
			top: rect.top + parseFloat(style.borderTopWidth) + paddingTop,
			height: rect.height - paddingTop - parseFloat(style.paddingBottom),
		};
	});
}

/** The div a TextOverlay draws its text in (foreignObject > wrapper > content). */
function displayTextOf(canvas: CanvasDriver) {
	return canvas.page.locator("foreignObject > div > div").first();
}

test.describe("text editing", () => {
	test("edits on double click and commits on an outside click", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "Hello Canvas");
		await canvas.commitText();

		await expect(canvas.page.locator("body")).toContainText("Hello Canvas");
	});

	test("cancels on Escape and does not save the text", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, "Discarded");
		await canvas.cancelText();

		await expect(canvas.page.locator("body")).not.toContainText("Discarded");
	});

	test("accepts multi-line text", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 650, y: 360 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 525, y: 280 }, "Line One\nLine Two");
		await canvas.commitText();

		const body = canvas.page.locator("body");
		await expect(body).toContainText("Line One");
		await expect(body).toContainText("Line Two");
	});

	// A line box is fontSize × 1.5 tall, so an odd size makes the drawn box end on
	// a half pixel. The editing surface has to end on the same one: a box rounded
	// to whole pixels moves vertically centered text the moment editing starts.
	for (const fontSize of [15, 21]) {
		test(`opens the editor on the text at font size ${fontSize}`, async ({
			canvas,
		}) => {
			await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 640, y: 320 },
			);
			await canvas.deselect();
			await canvas.typeTextAt({ x: 520, y: 260 }, "Hello Canvas");
			await canvas.commitText();

			await canvas.selectAt({ x: 520, y: 260 });
			await canvas.openObjectMenu("font-size");
			await canvas.setNumberInput("fontSize", fontSize);
			await canvas.deselect();

			const display = await contentBoxOf(displayTextOf(canvas));
			await canvas.typeTextAt({ x: 520, y: 260 }, "");
			const editor = await contentBoxOf(canvas.textEditorSurface());

			expect(editor).toEqual(display);
		});
	}
});

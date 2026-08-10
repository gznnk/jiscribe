import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/** Box the stick figure fills; the label hangs below its bottom edge (y = 300). */
const FIGURE_FROM = { x: 400, y: 200 };
const FIGURE_TO = { x: 480, y: 300 };
const FIGURE_CENTER = { x: 440, y: 250 };

test.describe("actor label", () => {
	test("edits the label below the figure and grows the box with the text", async ({
		canvas,
	}) => {
		await canvas.drawShapeFromFlyout(
			"general",
			"actor",
			FIGURE_FROM,
			FIGURE_TO,
		);
		await canvas.deselect();

		await canvas.typeTextAt(FIGURE_CENTER, "Customer");

		const editor = canvas.page.locator(selectors.textEditor);
		const oneLine = await editor.boundingBox();
		expect(oneLine).not.toBeNull();
		expect(oneLine!.y).toBeGreaterThan(
			canvas.toScreen({ x: FIGURE_CENTER.x, y: FIGURE_TO.y }).y,
		);

		// The region is derived from the uncommitted draft, so a second line must
		// make the editor taller while it is still open.
		await canvas.page.keyboard.type("\nSupport");
		await expect
			.poll(async () => (await editor.boundingBox())?.height ?? 0)
			.toBeGreaterThan(oneLine!.height);

		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText("Customer");
	});
});

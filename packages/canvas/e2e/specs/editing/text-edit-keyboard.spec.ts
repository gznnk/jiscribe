import { test, expect } from "../../fixtures";

/**
 * Starting text edit with the Enter key (StartTextEditCommand with code: "Enter").
 *
 * editing/text-edit.spec covers double-click-initiated editing and
 * editing/connector-label.spec covers the Enter-initiated connector label, but
 * the path of sending Enter to a single-selected "shape" to start editing its
 * body text was uncovered. This guards that Enter on a selected shape opens the
 * text-editor, that the input is committed and kept as the body text, and that
 * Escape cancels it.
 */
test.describe("keyboard: starting text edit with Enter", () => {
	test("starts body-text editing on Enter while a shape is selected and commits on an outside click", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		// Already selected right after drawing. Click first to make the selection and
		// canvas focus certain, then press Enter.
		await canvas.selectAt({ x: 500, y: 260 });

		await canvas.page.keyboard.press("Enter");
		await canvas.waitForTextEditor();

		await canvas.page.keyboard.type("Typed via Enter");
		await canvas.commitText();

		await expect(canvas.page.locator("body")).toContainText("Typed via Enter");
	});

	test("cancels an Enter-opened edit on Escape and leaves no body text", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.selectAt({ x: 500, y: 260 });

		await canvas.page.keyboard.press("Enter");
		await canvas.waitForTextEditor();

		await canvas.page.keyboard.type("Discarded via Escape");
		await canvas.cancelText();

		await expect(canvas.page.locator("body")).not.toContainText(
			"Discarded via Escape",
		);
	});
});

import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * Regression guard for the alternate key bindings declared in the command
 * registry.
 *
 * Existing specs cover the primary bindings, but the alternates below, assigned
 * to the same commands under a different name, were uncovered, so damage to the
 * shortcut table went undetected.
 * - Redo: primary Ctrl+Shift+Z (nudge.spec and others) / alternate Ctrl+Y (RedoCommand)
 * - Delete: primary Delete (selection.spec) / alternate Backspace (DeleteCommand)
 * - DeselectAll: Ctrl+Shift+A (DeselectAllCommand). Escape is a separate command
 *   (EscapeSelectionCommand, covered by selection.spec), so this is the only binding left here
 */
test.describe("keyboard: alternate bindings", () => {
	test("redoes on Ctrl+Y (alternate for Ctrl+Shift+Z)", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		// Center is (500, 260).
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		await canvas.nudge("right");
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 501, 260)");

		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 500, 260)");

		await canvas.page.keyboard.press("Control+y");
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "Ctrl+Y triggers redo",
			})
			.toBe("matrix(1, 0, 0, 1, 501, 260)");
	});

	test("deletes the selection on Backspace (alternate for Delete)", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const transform = await canvas.objectById(id).getAttribute("transform");

		await canvas.page.keyboard.press("Backspace");
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "Backspace deletes the selected shape",
			})
			.toBe(0);

		// Undo brings the same shape back, so the delete was pushed onto the history.
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			transform,
		);
	});

	test("clears the selection on Ctrl+Shift+A", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 440, y: 320 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 560, y: 200 }, { x: 700, y: 320 });

		await canvas.selectAll();
		expect(await canvas.hasAnyControl()).toBe(true);

		await canvas.page.keyboard.press("Control+Shift+a");
		await expect
			.poll(() => canvas.hasAnyControl(), {
				message: "Ctrl+Shift+A clears the selection",
			})
			.toBe(false);
		await expect(canvas.page.locator(selectors.control)).toHaveCount(0);
	});
});

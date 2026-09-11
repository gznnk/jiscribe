import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The undo / redo buttons of the toolbar: the default bar's only `command`
 * items, and the only buttons on it whose availability turns over as the
 * document changes.
 *
 * Two things are covered here because they fail independently:
 *
 * - Availability. Each button resolves its own `canExecute` through
 *   ToolbarCommandStateContext; the bar is not handed a disabled list. A
 *   subscription that stops arriving leaves the button stuck at whatever it
 *   was when the bar last rendered.
 * - The disabled *look*. ToolbarIconButton pins `color` on its `svg`, which
 *   outranks the `color` it sets on `:disabled`, so the icon has to be greyed
 *   out by a rule of its own. Without it the button is still inert but looks
 *   exactly like a live one — the failure that is invisible to every assertion
 *   about behaviour.
 */

const undoButton = selectors.toolbarCommand("undo");
const redoButton = selectors.toolbarCommand("redo");

/** Computed color of a toolbar button's glyph; the icons stroke with currentColor. */
const iconColor = (canvas: CanvasDriver, buttonSelector: string) =>
	canvas.page
		.locator(`${buttonSelector} svg`)
		.evaluate((el) => getComputedStyle(el).color);

test.describe("toolbar undo / redo", () => {
	test("turns over with the history and puts the shape back", async ({
		canvas,
	}) => {
		const undo = canvas.page.locator(undoButton);
		const redo = canvas.page.locator(redoButton);

		// Nothing has happened yet, so neither direction has anywhere to go.
		await expect(undo).toBeDisabled();
		await expect(redo).toBeDisabled();

		const rectId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 420, y: 300 },
		);
		await expect(undo).toBeEnabled();
		await expect(redo).toBeDisabled();

		// The press goes through the gesture system (ToolbarHandler → handleCommand),
		// so the document settles a frame later than the click resolves.
		await undo.click();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);
		await expect(undo).toBeDisabled();
		await expect(redo).toBeEnabled();

		await redo.click();
		await expect
			.poll(async () => (await canvas.captureObjects()).map((obj) => obj.id))
			.toEqual([rectId]);
		await expect(undo).toBeEnabled();
		await expect(redo).toBeDisabled();
	});

	test("greys the icon out while the button is disabled", async ({
		canvas,
	}) => {
		const undo = canvas.page.locator(undoButton);

		await expect(undo).toBeDisabled();
		const disabledColor = await iconColor(canvas, undoButton);

		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 420, y: 300 });
		await expect(undo).toBeEnabled();
		const enabledColor = await iconColor(canvas, undoButton);

		// The exact colors are the theme's business; that the two differ at all is
		// what tells the user the button is dead.
		expect(disabledColor).not.toBe(enabledColor);
	});
});

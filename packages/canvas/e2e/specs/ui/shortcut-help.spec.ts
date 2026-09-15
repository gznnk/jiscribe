import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The keyboard shortcut help modal (ShortcutHelpCommand / ModalShell /
 * ShortcutHelpModal).
 *
 * Two entrances reach the same command — the `?` binding and the toolbar's help
 * button — and the modal lists the shortcut-bearing commands of the registry,
 * its own binding among them.
 *
 * Escape is the part only a real DOM decides: ModalShell takes the key in the
 * capture phase precisely so useKeyboardShortcuts, which listens on the canvas
 * root in the bubble phase, never gets to run EscapeSelectionCommand. Which of
 * the two wins is the browser's event order, so it is asserted here.
 */

/** The modal's panel, named from the `testId` ShortcutHelpModal hands ModalShell. */
const MODAL = '[data-testid="shortcut-help"]';

/** The × in the modal's header; ModalShell derives it from the same `testId`. */
const MODAL_CLOSE = '[data-testid="shortcut-help:close"]';

/** The toolbar's help button, the entrance that is not a keystroke. */
const TOOLBAR_OPEN = selectors.toolbarCommand("shortcutHelp");

/** The box the Escape tests select, clear of the centred panel. */
const SHAPE_FROM = { x: 120, y: 150 };
const SHAPE_TO = { x: 240, y: 240 };

/**
 * Rests on the frame boundary React schedules its passive effects against, so a
 * keystroke sent next meets the listeners of what is now on screen. Not a timed
 * wait — the same footing as CanvasDriver's own wait for the gesture batch.
 */
async function settleEffects(canvas: CanvasDriver) {
	await canvas.page.evaluate(
		() =>
			new Promise((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
			),
	);
}

/**
 * Opens the modal from the toolbar and waits until it is listening for Escape.
 *
 * The panel reaching the DOM is not that moment: ModalShell subscribes from a
 * useEffect, which React runs after the commit that mounted it. A key sent on
 * the sight of the panel alone can land in that gap, where Escape is still the
 * canvas's own and clears the selection instead.
 */
async function openShortcutHelp(canvas: CanvasDriver) {
	await canvas.page.click(TOOLBAR_OPEN);
	await expect(canvas.page.locator(MODAL)).toBeVisible();
	await settleEffects(canvas);
}

test.describe("Keyboard shortcut help", () => {
	test("opens from the toolbar button and closes from the modal's ×", async ({
		canvas,
	}) => {
		const modal = canvas.page.locator(MODAL);
		await expect(modal).toHaveCount(0);

		await canvas.page.click(TOOLBAR_OPEN);
		await expect(modal).toBeVisible();

		await canvas.page.click(MODAL_CLOSE);
		await expect(modal).toHaveCount(0);
	});

	test("opens on ?", async ({ canvas }) => {
		// The keydown listener is on the canvas root, so the press has to land with
		// focus inside it; a click on empty space is what puts it there.
		await canvas.deselect();

		await canvas.page.keyboard.press("?");

		await expect(canvas.page.locator(MODAL)).toBeVisible();
	});

	test("lists its own binding, so ? is discoverable from the list it opens", async ({
		canvas,
	}) => {
		await canvas.page.click(TOOLBAR_OPEN);

		// The row is keyed by command id; the key caps sit in the sibling group.
		const ownRow = canvas.page.locator(
			'[data-testid="shortcut-help:shortcutHelp"]',
		);
		await expect(ownRow).toBeVisible();
		await expect(
			canvas.page.locator(MODAL),
			"a command with no binding is left out, so a listed row means a listed key",
		).toContainText("?");
	});

	test("closes on Escape while leaving the selection alone", async ({
		canvas,
	}) => {
		// Drawing leaves the rectangle selected, so its handles are what a leaked
		// EscapeSelectionCommand would take away.
		await canvas.drawShape("Rectangle", SHAPE_FROM, SHAPE_TO);
		await expect(canvas.page.locator(selectors.control).first()).toBeVisible();

		await openShortcutHelp(canvas);

		await canvas.page.keyboard.press("Escape");

		await expect(canvas.page.locator(MODAL)).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.control).first(),
			"the modal consumed the key, so the selection it was opened over survives",
		).toBeVisible();
	});

	test("takes the next Escape as a deselect once it is closed", async ({
		canvas,
	}) => {
		// The capture listener is torn down with the modal; if it were not, the
		// canvas would stay deaf to Escape for the rest of the session.
		await canvas.drawShape("Rectangle", SHAPE_FROM, SHAPE_TO);
		await openShortcutHelp(canvas);
		await canvas.page.keyboard.press("Escape");
		await expect(canvas.page.locator(MODAL)).toHaveCount(0);
		// The unsubscribe is that same useEffect's cleanup, and lands a frame after
		// the panel leaves the DOM.
		await settleEffects(canvas);

		await canvas.page.keyboard.press("Escape");

		await expect(canvas.page.locator(selectors.control)).toHaveCount(0);
	});

	test("closes on a press on the backdrop but not on the panel", async ({
		canvas,
	}) => {
		await canvas.page.click(TOOLBAR_OPEN);
		const modal = canvas.page.locator(MODAL);
		await expect(modal).toBeVisible();

		// The panel's own header: inside the modal, so the press is not the
		// backdrop's own target and nothing closes.
		await modal.click({ position: { x: 20, y: 20 } });
		await expect(modal).toBeVisible();

		// The backdrop is the panel's parent and covers the whole canvas, toolbar
		// included, so its top-left corner is a point the panel cannot reach.
		await modal.locator("..").click({ position: { x: 20, y: 20 } });
		await expect(modal).toHaveCount(0);
	});
});

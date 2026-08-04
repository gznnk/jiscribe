import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures";

/**
 * Tab is bound to the text-slot cycling commands, but a binding whose command
 * cannot execute must stay with the browser: otherwise the canvas root swallows
 * Tab unconditionally and keyboard focus can never leave it.
 * The counterpart (Tab consumed while a record's slots are cyclable) is covered
 * by shapes/record-text-slot.spec.ts.
 */
test.describe("keyboard: tab focus passthrough", () => {
	/** True when pressing Tab moves focus off the currently focused element. */
	const movesFocus = async (canvas: { page: Page }): Promise<boolean> => {
		await canvas.page.evaluate(() => {
			(window as { __focusBeforeTab?: Element | null }).__focusBeforeTab =
				document.activeElement;
		});
		await canvas.page.keyboard.press("Tab");
		return canvas.page.evaluate(
			() =>
				document.activeElement !==
				(window as { __focusBeforeTab?: Element | null }).__focusBeforeTab,
		);
	};

	test("moves focus out of the canvas when nothing is selected", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		expect(await movesFocus(canvas)).toBe(true);
	});

	test("moves focus when the selection has no slots to cycle", async ({
		canvas,
	}) => {
		// A rectangle is a single-body text shape, so the cycle commands cannot run.
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		expect(await movesFocus(canvas)).toBe(true);
	});
});

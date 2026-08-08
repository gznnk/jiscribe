import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * e2e coverage for the middle-button (button 1) routing regression (#159).
 *
 * Making `supports` exclusive in #110 left middle-button events matching no
 * handler at all, so a middle click during text editing never committed the
 * edit. The fix routes the middle button to CanvasEventHandler like the right
 * button, giving:
 *   - drag = pan (a canvas-level pan even when it starts on a shape)
 *   - click = commit the text edit only, without opening our context menu
 * See packages/canvas/docs/04-gesture-system.md for the spec.
 */
test.describe("middle-button routing (#159)", () => {
	test("pans the canvas on a middle drag even when it starts on a shape", async ({
		canvas,
	}) => {
		// Start the middle drag at the shape center, where the left button would move or select.
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		const before = await canvas.getViewBox();

		await canvas.middleDrag({ x: 500, y: 260 }, { x: 500, y: 420 });

		// A pan means the viewBox moves, i.e. it behaved at the canvas level despite starting on a shape.
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "the middle drag pans the viewBox",
			})
			.not.toBe(before);
		// The shape was neither selected nor moved, proving no object handler grabbed it.
		expect(await canvas.hasAnyControl()).toBe(false);
	});

	test("commits the edit when another shape is middle-clicked during text editing", async ({
		canvas,
	}) => {
		// Place two shapes at separate positions.
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });
		await canvas.drawShape("Rectangle", { x: 800, y: 500 }, { x: 960, y: 600 });
		await canvas.deselect();

		const rect1Center = { x: 380, y: 250 };
		const rect2Center = { x: 880, y: 550 };

		// Start editing rect1's text and type; the editor is open at this point.
		await canvas.typeTextAt(rect1Center, "Hi");
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();

		// Middle-click rect2: the edit commits and the editor closes. Before the fix the
		// event went nowhere and the editor stayed open.
		await canvas.middleClickAt(rect2Center);

		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);

		// The committed content survived: re-editing puts the caret at the end, offset 2.
		await canvas.page.mouse.dblclick(
			canvas.toScreen(rect1Center).x,
			canvas.toScreen(rect1Center).y,
		);
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		expect(await canvas.textEditorSelection()).toEqual({ start: 2, end: 2 });
		await canvas.cancelText();
	});

	test("does not open our context menu on a middle click", async ({
		canvas,
	}) => {
		// The right click opens the menu; the middle click must not encroach on that.
		await canvas.middleClickAt({ x: 70, y: 820 });

		expect(await canvas.contextMenuVisible()).toBe(false);
	});
});

import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * The zoom buttons of the toolbar (gesture path: kind=menu / id=toolbar /
 * part=command:*, with kind / id coming from the bar element around them).
 *
 * Two quick presses on the same button make the second one a doubleClick because of the
 * recognizer's exclusivity rule, but ToolbarHandler treats click and doubleClick alike,
 * so "N presses = N executions" holds (docs/04-gesture-system.md, "Repeat buttons").
 * This detects a regression of that.
 */

const zoomInButton = selectors.toolbarCommand("zoomIn");
const zoomOutButton = selectors.toolbarCommand("zoomOut");
const readout = selectors.toolbarCommand("resetZoom");

test.describe("toolbar zoom buttons", () => {
	test("zooms one step per click and returns to 100% on reset", async ({
		canvas,
	}) => {
		// The zoom stops are 1 -> 1.25 (ZOOM_STOPS in constants/zoom.ts).
		await canvas.page.click(zoomInButton);
		await expect(canvas.page.locator(readout)).toHaveText("125%");

		await canvas.page.click(zoomOutButton);
		await expect(canvas.page.locator(readout)).toHaveText("100%");

		await canvas.page.click(zoomInButton);
		await canvas.page.click(readout);
		await expect(canvas.page.locator(readout)).toHaveText("100%");
	});

	test("zooms two steps on two quick presses of the same button (the doubleClick of the second press runs too)", async ({
		canvas,
	}) => {
		const button = canvas.page.locator(zoomInButton);
		const box = await button.boundingBox();
		if (!box) {
			throw new Error("cannot get the position of the zoom button");
		}

		// Take the coordinates first and click the same point twice with no wait in
		// between. Within 300ms the second press becomes a doubleClick (beyond that it
		// is just two clicks, so two executions are expected either way and the test
		// does not depend on timing).
		const cx = box.x + box.width / 2;
		const cy = box.y + box.height / 2;
		await canvas.page.mouse.click(cx, cy);
		await canvas.page.mouse.click(cx, cy);

		// Two steps 1 -> 1.25 -> 1.5 (if the second press is dropped it stays at 125%).
		await expect(canvas.page.locator(readout)).toHaveText("150%");
	});
});

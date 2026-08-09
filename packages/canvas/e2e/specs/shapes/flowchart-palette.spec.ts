import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Guards that the flowchart flyout shapes can be created and render as the
 * expected SVG elements. It pins the "reuse the type, let the preset carry the
 * meaning" decision:
 * - process           ... reuses the rect type (`<rect>`)
 * - decision          ... reuses the diamond type (`<polygon>`)
 * - onPageConnector   ... a small circle reusing the ellipse type (`<ellipse>`)
 * - offPageConnector  ... its own home-plate pentagon type (`<polygon>`)
 */

const FLOWCHART = "flowchart";

/** The canvas computed cursor. crosshair means draw mode is on. */
async function canvasCursor(canvas: CanvasDriver): Promise<string> {
	return canvas.page
		.locator('[data-kind="canvas"]')
		.evaluate((el) => getComputedStyle(el).cursor);
}

/** Creates one presetId from the flowchart flyout by diagonal drag and returns its SVG tag name. */
async function createFromFlyout(
	canvas: CanvasDriver,
	presetId: string,
	from: { x: number; y: number },
	to: { x: number; y: number },
): Promise<string | null> {
	const before = await canvas.captureObjects();
	const beforeIds = new Set(before.map((obj) => obj.id));

	await canvas.page.click(selectors.categoryButton(FLOWCHART));
	const item = canvas.page.locator(selectors.shapeItem(presetId));
	await expect(item).toBeVisible();
	await item.click();
	await expect
		.poll(() => canvasCursor(canvas), {
			message: `clicking ${presetId} enters draw mode`,
		})
		.toBe("crosshair");

	await canvas.drag(from, to);
	await expect
		.poll(async () => (await canvas.captureObjects()).length, {
			message: `exactly one ${presetId} is created`,
		})
		.toBe(before.length + 1);

	const created = (await canvas.captureObjects()).find(
		(obj) => !beforeIds.has(obj.id),
	);
	return created?.tag ?? null;
}

test.describe("flowchart palette", () => {
	test("creates every shape from the flyout with the right SVG element", async ({
		canvas,
	}) => {
		// Presets that reuse a type (process=rect / decision=diamond / on-page=ellipse)
		expect(
			await createFromFlyout(
				canvas,
				"process",
				{ x: 300, y: 220 },
				{ x: 440, y: 300 },
			),
		).toBe("rect");

		expect(
			await createFromFlyout(
				canvas,
				"diamond",
				{ x: 480, y: 220 },
				{ x: 600, y: 320 },
			),
		).toBe("polygon");

		expect(
			await createFromFlyout(
				canvas,
				"onPageConnector",
				{ x: 300, y: 360 },
				{ x: 380, y: 440 },
			),
		).toBe("ellipse");

		// The off-page connector has a type of its own (pentagon)
		expect(
			await createFromFlyout(
				canvas,
				"offPageConnector",
				{ x: 460, y: 360 },
				{ x: 580, y: 460 },
			),
		).toBe("polygon");
	});

	test("creates multiDocument / storedData / loopLimit from the flyout", async ({
		canvas,
	}) => {
		// multiDocument draws three clipped sheets as several elements (data-kind sits on the g only)
		expect(
			await createFromFlyout(
				canvas,
				"multiDocument",
				{ x: 300, y: 220 },
				{ x: 440, y: 320 },
			),
		).toBe("g");

		expect(
			await createFromFlyout(
				canvas,
				"storedData",
				{ x: 480, y: 220 },
				{ x: 620, y: 300 },
			),
		).toBe("path");

		expect(
			await createFromFlyout(
				canvas,
				"loopLimit",
				{ x: 300, y: 360 },
				{ x: 440, y: 440 },
			),
		).toBe("polygon");
	});
});

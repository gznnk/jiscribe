import { test, expect } from "../../fixtures";

/**
 * Unified z-order lets a connector sit behind shapes. Hit testing follows SVG paint
 * order (= DOM order), so sending a connector to the back makes an overlapping shape
 * win selection.
 * Whether the connector is selected is told from the presence of the line-color menu
 * (connector only).
 */
test.describe("connector hit testing (z-order aware)", () => {
	test("selects the overlapping shape when the connector is sent to the back", async ({
		canvas,
	}) => {
		// Two stacked rectangles plus one covering the midpoint (~500,350) of the
		// vertical connector between them
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 440, y: 310 }, { x: 560, y: 390 });
		await canvas.deselect();

		// Connector from the top rectangle's bottomCenter to the bottom one; it runs
		// through the covering rectangle
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.createConnector("bottomCenter", { x: 500, y: 450 });
		await canvas.deselect();

		const lineColor = canvas.page.locator('[data-part="toggle:line-color"]');

		// A new connector is frontmost, so clicking the overlap selects it
		await canvas.selectAt({ x: 500, y: 350 });
		await expect(lineColor).toBeVisible();

		await canvas.arrange("sendToBack");
		await canvas.deselect();

		// Same point: the covering rectangle is now in front, so the connector loses
		await canvas.selectAt({ x: 500, y: 350 });
		await expect(lineColor).toHaveCount(0);
	});
});

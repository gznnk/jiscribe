import { test, expect } from "../../fixtures";

/**
 * ObjectMenu's StackOrder section is available for a selected connector too, and it can
 * move the connector to the back / front.
 *
 * In SVG, DOM order is paint order (later elements are in front). captureObjects()
 * returns shapes and connectors in DOM order, so the z-order is checked through the
 * connector's position relative to the rectangles.
 * (objectIndex() covers only [data-kind=object] and excludes connectors.)
 */
test.describe("connector stacking order (StackOrder menu)", () => {
	test("shows StackOrder for a selected connector and moves it to the back / front", async ({
		canvas,
	}) => {
		const rectA = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 150 },
			{ x: 600, y: 250 },
		);
		await canvas.deselect();
		const rectB = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 450 },
			{ x: 600, y: 550 },
		);
		await canvas.deselect();

		// Connector from the top rectangle's bottomCenter to the bottom one
		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 450,
		});
		await canvas.deselect();

		// zOrderIndex is DOM order over shapes + connectors (back = small, front = large)

		// A new connector is frontmost (after both rectangles)
		await expect
			.poll(
				async () =>
					(await canvas.zOrderIndex(connectorId)) >
					(await canvas.zOrderIndex(rectB)),
			)
			.toBe(true);

		// Click on the line to select the connector
		await canvas.selectAt({ x: 500, y: 350 });

		// The StackOrder section shows up for a connector selection too
		await expect(
			canvas.page.locator('[data-part="toggle:stack-order"]'),
		).toBeVisible();

		// Send to back: from in front of both rectangles to behind them
		await canvas.arrange("sendToBack");
		await expect
			.poll(
				async () =>
					(await canvas.zOrderIndex(connectorId)) <
					(await canvas.zOrderIndex(rectA)),
			)
			.toBe(true);

		// Re-select to reset the menu state: arrange opens by toggle, so a second
		// consecutive call would close it.
		await canvas.deselect();
		await canvas.selectAt({ x: 500, y: 350 });

		// Bring to front: in front of both rectangles again
		await canvas.arrange("bringToFront");
		await expect
			.poll(
				async () =>
					(await canvas.zOrderIndex(connectorId)) >
					(await canvas.zOrderIndex(rectB)),
			)
			.toBe(true);
	});
});

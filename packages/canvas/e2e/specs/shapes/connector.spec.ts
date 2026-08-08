import { test, expect } from "../../fixtures";

test.describe("connector", () => {
	test("connects two shapes by dragging from an anchor", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		// Select the upper rectangle and drag from its bottom anchor to the top edge midpoint of the
		// lower one.
		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 450,
		});

		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === connectorId,
		);
		expect(created?.tag).toBe("polyline");
	});

	test("follows when the source shape is moved", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 500,
			y: 450,
		});
		await canvas.deselect();

		const pointsBefore = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// Move the upper rectangle to the right.
		await canvas.drag({ x: 500, y: 200 }, { x: 800, y: 200 });

		await expect
			.poll(async () => canvas.objectById(connectorId).getAttribute("points"))
			.not.toBe(pointsBefore);
	});

	test("leaves a newly created connector unselected", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.createConnector("bottomCenter", { x: 500, y: 450 });

		// The connector ObjectMenu (line color) is absent, meaning nothing is selected.
		await expect(
			canvas.page.locator('[data-part="toggle:line-color"]'),
		).toHaveCount(0);
	});

	test("selects a connector by clicking on its line", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.createConnector("bottomCenter", { x: 500, y: 450 });
		await canvas.deselect();

		// Click near the midpoint of the vertical connector (x=500) to select it.
		await canvas.clickAt({ x: 500, y: 350 });

		// The connector ObjectMenu (line color) appears, meaning it is selected.
		await expect(
			canvas.page.locator('[data-part="toggle:line-color"]'),
		).toBeVisible();
	});

	test("deletes a selected connector with Delete", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.createConnector("bottomCenter", { x: 500, y: 450 });
		await canvas.deselect();

		const connectorLocator = canvas.page.locator(
			"polyline[data-kind=connector]",
		);
		await expect(connectorLocator).toHaveCount(1);

		await canvas.clickAt({ x: 500, y: 350 });
		// Wait until the click-based selection is applied (the connector ObjectMenu appears) before
		// deleting. Pressing Delete before the selection commits deletes nothing and is flaky.
		await expect(
			canvas.page.locator('[data-part="toggle:line-color"]'),
		).toBeVisible();
		await canvas.deleteSelection();

		// The connector is gone and the two shapes remain.
		await expect(connectorLocator).toHaveCount(0);
		expect(
			(await canvas.captureObjects()).filter((obj) => obj.tag === "rect")
				.length,
		).toBe(2);
	});
});

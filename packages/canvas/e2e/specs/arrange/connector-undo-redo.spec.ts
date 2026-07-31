import { test, expect } from "../../fixtures";

/**
 * Undo / redo of connector creation through the history and the canvasToState round
 * trip (a connector is a member of rootIds too).
 */
test.describe("connector undo / redo", () => {
	test("removes a created connector on undo and brings the same id back on redo", async ({
		canvas,
	}) => {
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

		// Right after creation the connector is present in the z-order
		await expect
			.poll(() => canvas.zOrderIndex(connectorId))
			.toBeGreaterThanOrEqual(0);

		await canvas.undo();
		await expect.poll(() => canvas.zOrderIndex(connectorId)).toBe(-1);

		// Back with the same id
		await canvas.redo();
		await expect
			.poll(() => canvas.zOrderIndex(connectorId))
			.toBeGreaterThanOrEqual(0);
	});
});

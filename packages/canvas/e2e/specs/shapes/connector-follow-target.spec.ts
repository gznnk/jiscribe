import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Connector following its target shape.
 *
 * Endpoint resolution (resolveConnectorPoints) takes different paths for source and target, so a
 * regression can break following on one side alone (see connector.spec for the source side).
 * Moving both ends in turn and watching the points change each time shows both endpoints are
 * still wired up.
 */

/** Joins two stacked rectangles with a vertical connector and returns its ID (left deselected) */
async function buildConnectedPair(canvas: CanvasDriver): Promise<string> {
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
	return connectorId;
}

test.describe("connector following its target", () => {
	test("follows when the target shape is moved", async ({ canvas }) => {
		const connectorId = await buildConnectedPair(canvas);

		const pointsBefore = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// Move the lower (target) rectangle right.
		await canvas.drag({ x: 500, y: 500 }, { x: 800, y: 500 });

		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "the connector follows the target's move",
			})
			.not.toBe(pointsBefore);
	});

	test("keeps following both ends when the source and the target are moved in turn", async ({
		canvas,
	}) => {
		const connectorId = await buildConnectedPair(canvas);

		const pointsInitial = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// First move the source (upper) rectangle right.
		await canvas.drag({ x: 500, y: 200 }, { x: 750, y: 200 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "it follows the source's move",
			})
			.not.toBe(pointsInitial);
		const pointsAfterSource = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// Then move the target (lower) rectangle right as well.
		await canvas.drag({ x: 500, y: 500 }, { x: 750, y: 500 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "it follows the target's move too",
			})
			.not.toBe(pointsAfterSource);
	});
});

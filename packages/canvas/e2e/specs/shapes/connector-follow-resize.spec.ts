import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Connector following when a connected shape is resized.
 *
 * Connector endpoints resolve to an anchor on a shape's edge, so moving that edge by resizing
 * has to update the points (see connector-follow-target for moves). Both the source and the
 * target resize are covered.
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

test("follows at both ends when a connected shape is resized", async ({
	canvas,
}) => {
	const connectorId = await buildConnectedPair(canvas);
	const points = () => canvas.objectById(connectorId).getAttribute("points");
	const initial = await points();

	// Stretch the source rectangle's bottom edge downward.
	await canvas.selectAt({ x: 500, y: 200 });
	await canvas.dragTransformHandle(
		"bottomCenter",
		{ x: 500, y: 330 },
		{ ctrl: true },
	);
	await expect
		.poll(points, { message: "the connector follows the source resize" })
		.not.toBe(initial);
	const afterSource = await points();

	// Stretch the target rectangle's top edge upward.
	await canvas.deselect();
	await canvas.selectAt({ x: 500, y: 500 });
	await canvas.dragTransformHandle(
		"topCenter",
		{ x: 500, y: 380 },
		{ ctrl: true },
	);
	await expect
		.poll(points, { message: "the connector follows the target resize" })
		.not.toBe(afterSource);
});

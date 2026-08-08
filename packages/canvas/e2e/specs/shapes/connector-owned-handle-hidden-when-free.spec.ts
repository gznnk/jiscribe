import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec guarding the "at least one end is owned" invariant of a connector through the endpoint
 * handles shown in the UI.
 *
 * ConnectorControls hides the handle of the owned end when the opposite end is free
 * (showSourceHandle = sourceIsFree || !targetIsFree). Without hiding it, the last owned end could
 * be dragged into empty space, producing a connector with both ends free. This is the UI-level
 * embodiment of that invariant (which is why the defensive guard in handleDragEnd is normally
 * unreachable).
 *
 * Observed contract:
 *   - connector with both ends owned -> both source and target endpoint handles appear
 *   - connector with one free end -> only the free end's handle appears, the remaining owned end
 *     has no handle
 */

function sourceHandle(canvas: CanvasDriver, id: string) {
	return canvas.page.locator(`[data-id="${id}"][data-part="endpoint:source"]`);
}
function targetHandle(canvas: CanvasDriver, id: string) {
	return canvas.page.locator(`[data-id="${id}"][data-part="endpoint:target"]`);
}

/**
 * Selects the horizontal connector (y=350) by clicking its midpoint and waits for the given
 * endpoint handle. A single click occasionally misses the line, so it keeps clicking until the
 * handle appears (re-selecting is idempotent).
 */
async function selectUntilHandle(
	canvas: CanvasDriver,
	id: string,
	endpoint: "source" | "target",
) {
	await expect
		.poll(
			async () => {
				await canvas.clickAt({ x: 610, y: 350 });
				return canvas.page
					.locator(`[data-id="${id}"][data-part="endpoint:${endpoint}"]`)
					.count();
			},
			{
				message: `click the line until the ${endpoint} handle appears`,
				timeout: 8000,
			},
		)
		.toBeGreaterThan(0);
}

test.describe("endpoint handle visibility of a connector (owned/free)", () => {
	test("shows both source and target handles when both ends are owned", async ({
		canvas,
	}) => {
		// A.rightCenter -> B.leftCenter (a horizontal connector with both ends owned).
		await canvas.drawShape("Rectangle", { x: 300, y: 300 }, { x: 460, y: 400 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 760, y: 300 }, { x: 920, y: 400 });
		await canvas.deselect();
		await canvas.selectAt({ x: 380, y: 350 });
		const id = await canvas.createConnector("rightCenter", { x: 840, y: 350 });
		await canvas.deselect();

		// Click the line to select it; the source handle appearing confirms the selection.
		await selectUntilHandle(canvas, id, "source");

		await expect(
			sourceHandle(canvas, id),
			"source handle appears when both ends are owned",
		).toBeVisible();
		await expect(
			targetHandle(canvas, id),
			"target handle appears when both ends are owned",
		).toBeVisible();
	});

	test("hides the owned end handle and shows only the free end when one end is free", async ({
		canvas,
	}) => {
		// A.rightCenter -> empty space (target is free). Only source A is owned.
		await canvas.drawShape("Rectangle", { x: 300, y: 300 }, { x: 460, y: 400 });
		await canvas.deselect();
		await canvas.selectAt({ x: 380, y: 350 });
		const id = await canvas.createConnector("rightCenter", { x: 760, y: 350 });
		await canvas.deselect();

		// Click the line to select it, waiting for the free end (target) handle to appear.
		await selectUntilHandle(canvas, id, "target");
		await expect(
			targetHandle(canvas, id),
			"handle of the free end (target) appears",
		).toBeVisible();

		await expect(
			sourceHandle(canvas, id),
			"handle of the owned end (source) is hidden, so the last owned end cannot be freed",
		).toHaveCount(0);
	});
});

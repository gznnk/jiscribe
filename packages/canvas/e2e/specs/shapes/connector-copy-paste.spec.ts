import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Endpoint remapping when a connector is cloned together with the shapes it connects.
 *
 * cloneObjects rewrites the source/target endpoints of a connector whose shapes are both inside
 * the cloned set to the new IDs (remapEndpointRef). If that breaks, the cloned connector keeps
 * pointing at the original shapes or at nothing and stops following moves. Counts and types
 * would not expose it, so the invariant checked is that moving a cloned shape drags only the
 * cloned connector while the original one stays put.
 *
 * Copy and paste (handlePaste) and duplicate (DuplicateCommand) are separate entry points into
 * the shared cloneObjects; both are covered.
 */

/** data-ids of the connectors currently present (data-kind=connector polylines) */
async function connectorIds(canvas: CanvasDriver): Promise<string[]> {
	return (await canvas.captureObjects())
		.filter((obj) => obj.tag === "polyline")
		.map((obj) => obj.id)
		.filter((id): id is string => id !== null);
}

/**
 * Sets up two stacked rectangles joined by a vertical connector and returns the connector's ID.
 * The upper rectangle is centered at (500,200), the lower one at (500,450).
 */
async function setupConnectedPair(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 400 }, { x: 600, y: 500 });
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 400,
	});
	await canvas.deselect();
	return connectorId;
}

test.describe("cloning a connector with its connected shapes (endpoint remapping)", () => {
	test("attaches the cloned connector to the cloned shapes on copy and paste while the original stays put", async ({
		canvas,
	}) => {
		const srcConnectorId = await setupConnectedPair(canvas);

		// Select everything (2 rectangles + the connector) and copy and paste it.
		await canvas.selectAll();
		await canvas.copy();
		await canvas.paste();

		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message:
					"copy and paste adds 2 shapes and 1 connector for a total of 6",
			})
			.toBe(6);
		expect((await connectorIds(canvas)).length).toBe(2);

		// The added connector is the cloned one.
		const clonedConnectorId = (await connectorIds(canvas)).find(
			(id) => id !== srcConnectorId,
		);
		if (!clonedConnectorId) {
			throw new Error("cannot read the data-id of the cloned connector");
		}

		const srcPointsBefore = await canvas
			.objectById(srcConnectorId)
			.getAttribute("points");
		const clonedPointsBefore = await canvas
			.objectById(clonedConnectorId)
			.getAttribute("points");

		// The cloned upper rectangle sits at (520,220), offset by +20,+20 from the original and in
		// front of it. Dragging it far right moves only the cloned connector when the endpoints
		// were remapped correctly.
		await canvas.deselect();
		await canvas.drag({ x: 520, y: 220 }, { x: 820, y: 220 });

		await expect
			.poll(() => canvas.objectById(clonedConnectorId).getAttribute("points"), {
				message: "the cloned connector follows the cloned shape's move",
			})
			.not.toBe(clonedPointsBefore);

		// The original connector is still attached to the original shapes, so it stays put.
		expect(await canvas.objectById(srcConnectorId).getAttribute("points")).toBe(
			srcPointsBefore,
		);
	});

	test("attaches the cloned connector to the cloned shapes on Ctrl+D too while the original stays put", async ({
		canvas,
	}) => {
		const srcConnectorId = await setupConnectedPair(canvas);

		// Duplicate through DuplicateCommand, which does not go through the clipboard.
		await canvas.selectAll();
		await canvas.duplicate();

		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "duplicating brings the total to 6",
			})
			.toBe(6);

		const clonedConnectorId = (await connectorIds(canvas)).find(
			(id) => id !== srcConnectorId,
		);
		if (!clonedConnectorId) {
			throw new Error("cannot read the data-id of the cloned connector");
		}

		const srcPointsBefore = await canvas
			.objectById(srcConnectorId)
			.getAttribute("points");
		const clonedPointsBefore = await canvas
			.objectById(clonedConnectorId)
			.getAttribute("points");

		await canvas.deselect();
		await canvas.drag({ x: 520, y: 220 }, { x: 820, y: 220 });

		await expect
			.poll(() => canvas.objectById(clonedConnectorId).getAttribute("points"), {
				message: "the cloned connector follows the cloned shape's move",
			})
			.not.toBe(clonedPointsBefore);
		expect(await canvas.objectById(srcConnectorId).getAttribute("points")).toBe(
			srcPointsBefore,
		);
	});
});

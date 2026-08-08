import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Reconnecting a connector by dragging an endpoint, and undoing it.
 *
 * connector.spec covers creation and following, connector-follow-target covers following at both
 * ends, but dragging the endpoint handle of a selected connector
 * (data-id=<id> + data-part="endpoint:target") onto another shape to swap the connected shape was
 * uncovered. Reconnecting is the core operation that replaces the owner of an endpoint; when it
 * breaks, the line is left behind on the old shape. Guards, through changes / non-changes of
 * points, that after the swap the connector follows the new shape and not the old one, and that
 * undo restores the original connection (i.e. the owner swap is pushed onto the history).
 */

/** Drags from the center of the control (a CSS selector) to an absolute coordinate. */
async function dragControlTo(
	canvas: CanvasDriver,
	controlSelector: string,
	to: { x: number; y: number },
) {
	const control = canvas.page.locator(controlSelector);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`position of control ${controlSelector} is not available`);
	}
	// box is in screen coordinates; drag takes content coordinates, so convert with toContent.
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		12,
	);
}

/**
 * Connects A (top, center 500,200) and B (bottom, center 500,500) with a connector and places C
 * (center 830,490) on the right. Returns the connector id (the selection is cleared afterwards).
 */
async function placeAbcAndConnect(canvas: CanvasDriver): Promise<string> {
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

	await canvas.drawShape("Rectangle", { x: 760, y: 440 }, { x: 900, y: 540 });
	await canvas.deselect();

	return connectorId;
}

/** Selects the connector and drags the target endpoint onto the center of C (830,490). */
async function reconnectTargetToC(canvas: CanvasDriver, connectorId: string) {
	await canvas.clickAt({ x: 500, y: 350 });
	await expect(
		canvas.page.locator(
			`[data-id="${connectorId}"][data-part="endpoint:target"]`,
		),
	).toBeVisible();
	const pointsBefore = await canvas
		.objectById(connectorId)
		.getAttribute("points");
	await dragControlTo(
		canvas,
		`[data-id="${connectorId}"][data-part="endpoint:target"]`,
		{
			x: 830,
			y: 490,
		},
	);
	// Wait until the reconnect is committed and points switch to following C. The state update on
	// dragEnd is async; without syncing here a following undo can overtake the commit and no-op.
	await expect
		.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
			message: "points of the connector change once the reconnect is applied",
		})
		.not.toBe(pointsBefore);
}

/** Selects the connector and drags the source endpoint onto the center of C (830,490). */
async function reconnectSourceToC(canvas: CanvasDriver, connectorId: string) {
	await canvas.clickAt({ x: 500, y: 350 });
	await expect(
		canvas.page.locator(
			`[data-id="${connectorId}"][data-part="endpoint:source"]`,
		),
	).toBeVisible();
	const pointsBefore = await canvas
		.objectById(connectorId)
		.getAttribute("points");
	await dragControlTo(
		canvas,
		`[data-id="${connectorId}"][data-part="endpoint:source"]`,
		{
			x: 830,
			y: 490,
		},
	);
	await expect
		.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
			message:
				"points of the connector change once the source reconnect is applied",
		})
		.not.toBe(pointsBefore);
}

test.describe("reconnecting a connector", () => {
	test("swaps the connected shape when an endpoint handle is dragged onto another shape", async ({
		canvas,
	}) => {
		const connectorId = await placeAbcAndConnect(canvas);

		await reconnectTargetToC(canvas, connectorId);
		await canvas.deselect();

		const pointsAfterReconnect = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// Moving the original target B no longer drags the connector along (already swapped).
		await canvas.drag({ x: 500, y: 500 }, { x: 300, y: 500 });
		expect(await canvas.objectById(connectorId).getAttribute("points")).toBe(
			pointsAfterReconnect,
		);

		// Moving the new target C drags the connector along.
		await canvas.drag({ x: 830, y: 490 }, { x: 1010, y: 490 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "follows the new shape C after the swap",
			})
			.not.toBe(pointsAfterReconnect);
	});

	test("restores the original connected shape when the reconnect is undone", async ({
		canvas,
	}) => {
		const connectorId = await placeAbcAndConnect(canvas);

		await reconnectTargetToC(canvas, connectorId);

		// Undo moves the connected shape back from C to B.
		await canvas.undo();
		await canvas.deselect();

		const pointsAfterUndo = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// Moving C, the former swap target, no longer drags it along (the connection is back on B).
		await canvas.drag({ x: 830, y: 490 }, { x: 1010, y: 490 });
		expect(await canvas.objectById(connectorId).getAttribute("points")).toBe(
			pointsAfterUndo,
		);

		// Moving the original target B drags the connector along again.
		await canvas.drag({ x: 500, y: 500 }, { x: 300, y: 500 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message:
					"connection to the original shape B is restored and follows after undo",
			})
			.not.toBe(pointsAfterUndo);
	});

	test("swaps the source shape when the source endpoint is dragged onto another shape", async ({
		canvas,
	}) => {
		const connectorId = await placeAbcAndConnect(canvas);

		await reconnectSourceToC(canvas, connectorId);
		await canvas.deselect();

		const pointsAfterReconnect = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// Moving the original source A no longer drags the connector along (already swapped).
		await canvas.drag({ x: 500, y: 200 }, { x: 300, y: 200 });
		expect(await canvas.objectById(connectorId).getAttribute("points")).toBe(
			pointsAfterReconnect,
		);

		// Moving the new source C drags the connector along.
		await canvas.drag({ x: 830, y: 490 }, { x: 1010, y: 490 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "follows the new shape C after the swap",
			})
			.not.toBe(pointsAfterReconnect);
	});

	test("restores the original source shape when the source reconnect is undone", async ({
		canvas,
	}) => {
		const connectorId = await placeAbcAndConnect(canvas);

		await reconnectSourceToC(canvas, connectorId);
		const pointsConnectedToC = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// Undo moves the source shape back from C to A. To avoid a race between the reconnect
		// commit and undo, wait until points leave the C-connected state before measuring.
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "undo is applied and the connection to C is released",
			})
			.not.toBe(pointsConnectedToC);
		await canvas.deselect();

		const pointsAfterUndo = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// Moving C, the former swap target, no longer drags it along (the source is back on A).
		await canvas.drag({ x: 830, y: 490 }, { x: 1010, y: 490 });
		expect(await canvas.objectById(connectorId).getAttribute("points")).toBe(
			pointsAfterUndo,
		);

		// Moving the original source A drags the connector along again.
		await canvas.drag({ x: 500, y: 200 }, { x: 300, y: 200 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message:
					"connection to the original shape A is restored and follows after undo",
			})
			.not.toBe(pointsAfterUndo);
	});
});

import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Guards the hit area of the lock's shackle.
 *
 * The shackle is an open arc: it strokes a line but fills nothing, so it paints
 * nothing that `document.elementsFromPoint` can find (getHoveredElements). Drop
 * targets for a connector are resolved that way, and the anchors it snaps to are
 * drawn `pointer-events: none` — so before the shape grew a hit path of its own
 * (PictogramFigure.hit), the whole upper part of the lock's box refused
 * connectors, the top anchor included.
 *
 * The drop point here is deliberately above the body block and inside the
 * shackle, so only that hit path can make the connection succeed.
 */

const LOCK_FROM = { x: 600, y: 200 };
const LOCK_TO = { x: 800, y: 440 };

const LOCK_WIDTH = LOCK_TO.x - LOCK_FROM.x;
const LOCK_HEIGHT = LOCK_TO.y - LOCK_FROM.y;

/** Body block top (LOCK_BODY_TOP_RATIO) — everything above this is shackle only. */
const BODY_TOP_Y = LOCK_FROM.y + LOCK_HEIGHT * 0.36;

/**
 * Between the shackle's shoulders (0.22) and the body block (0.36), on the center
 * line: inside the shackle's hit path, outside every painted silhouette.
 */
const SHACKLE_DROP = {
	x: LOCK_FROM.x + LOCK_WIDTH / 2,
	y: LOCK_FROM.y + LOCK_HEIGHT * 0.3,
};

test.describe("dropping a connector on the lock's shackle", () => {
	test("connects to the lock when dropped above its body block", async ({
		canvas,
	}) => {
		expect(
			SHACKLE_DROP.y,
			"the drop point is above the body block, so only the shackle can catch it",
		).toBeLessThan(BODY_TOP_Y);

		await canvas.drawShape("Rectangle", { x: 200, y: 280 }, { x: 360, y: 380 });
		await canvas.deselect();

		const lockId = await canvas.drawShapeFromFlyout(
			"general",
			"lock",
			LOCK_FROM,
			LOCK_TO,
		);
		await canvas.deselect();

		await canvas.selectAt({ x: 280, y: 330 });
		const connectorId = await canvas.createConnector(
			"rightCenter",
			SHACKLE_DROP,
		);
		await canvas.deselect();

		// Moving the lock drags the connector along, so it really is connected to it
		// rather than left dangling at the drop point.
		const before = await canvas.objectById(connectorId).getAttribute("points");
		await canvas.drag(
			{ x: LOCK_FROM.x + LOCK_WIDTH / 2, y: LOCK_FROM.y + LOCK_HEIGHT * 0.75 },
			{
				x: LOCK_FROM.x + LOCK_WIDTH / 2 + 140,
				y: LOCK_FROM.y + LOCK_HEIGHT * 0.75 + 90,
			},
		);
		await canvas.deselect();

		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "the connector follows the lock, so the endpoint is attached",
			})
			.not.toBe(before);

		expect(
			await canvas.objectById(lockId).count(),
			"the lock is still on the canvas",
		).toBe(1);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Deleting a waypoint of a connector that was picked by clicking its handle.
 *
 * polyline-vertex.spec covers the same gesture on a standalone shape. A
 * connector reaches `selection.objectIds` only on its own, so this is the only path that
 * exercises the "sole selection" test (reconcileSelection) for one.
 * Lose it and the waypoint pick is dropped the moment it is made, which turns
 * Delete back into "delete the connector".
 *
 * Sync note: a waypoint counts as picked once its handle takes the selection
 * fill (#0d99ff), the same commit point polyline-vertex.spec waits for. Delete is
 * pressed only after that.
 *
 * Waypoint note: a connector's `points` holds the waypoints alone, the endpoints
 * not among them, so the route is bent once and that one waypoint is deleted —
 * down to none, which a floor borrowed from the polyline used to refuse.
 */

type Vec = { x: number; y: number };

const SELECTED_FILL = "#0d99ff";

/** Parses the polyline points attribute "x1,y1 x2,y2 ..." into an array of coordinates. */
function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("points attribute is missing");
	}
	return attr
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

/** Reads the currently drawn route, endpoints included, so its length is waypoints + 2. */
async function readPoints(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec[]> {
	return parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
}

const midpoint = (a: Vec, b: Vec): Vec => ({
	x: (a.x + b.x) / 2,
	y: (a.y + b.y) / 2,
});

const waypointHandle = (
	canvas: CanvasDriver,
	connectorId: string,
	waypointIndex: number,
) =>
	canvas.page.locator(
		`[data-kind="control"][data-id="${connectorId}"][data-part="vertex:${waypointIndex}"]`,
	);

/** Selects the connector by clicking the midpoint of its longest segment. */
async function selectConnector(canvas: CanvasDriver, connectorId: string) {
	const points = await readPoints(canvas, connectorId);
	let best = { mid: points[0], length: -1 };
	for (let i = 1; i < points.length; i++) {
		const [a, b] = [points[i - 1], points[i]];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (length > best.length) {
			best = { mid: midpoint(a, b), length };
		}
	}
	await canvas.clickAt(best.mid);
	await expect(
		canvas.page.locator('[data-part="toggle:connector-routing"]'),
	).toBeVisible();
}

/**
 * Switches the selected connector to straight routing, then puts the ObjectMenu away.
 *
 * Only straight gives the waypoints handles of their own (orthogonal makes whole segments
 * grabbable instead), and there is no handle to click without them. Closing the flyout and
 * taking the pointer off the menu lets the menu move again, so it does not stay parked over
 * the segments the inserts below grab (see connector-straight-segment-drag.spec).
 */
async function switchToStraightRouting(
	canvas: CanvasDriver,
	connectorId: string,
) {
	await canvas.openObjectMenu("connector-routing");
	await canvas.page.click('[data-part="command:setRoutingStraight"]');
	await expect
		.poll(async () => (await readPoints(canvas, connectorId)).length, {
			message: "straight routing draws a single direct line",
		})
		.toBe(2);
	await canvas.openObjectMenu("connector-routing");
	await canvas.page.mouse.move(0, 0);
}

/**
 * Drags the midpoint insert handle of a segment out to `to`, adding a waypoint there.
 * The connector must already be selected, since the handles live with the selection controls.
 */
async function insertWaypoint(
	canvas: CanvasDriver,
	connectorId: string,
	segmentIndex: number,
	to: Vec,
) {
	const points = await readPoints(canvas, connectorId);
	const before = points.length;
	await expect(
		canvas.page.locator(
			`[data-kind="control"][data-id="${connectorId}"][data-part="waypoint-insert:${segmentIndex}"]`,
		),
	).toBeVisible();
	await canvas.drag(
		midpoint(points[segmentIndex], points[segmentIndex + 1]),
		to,
	);
	await expect
		.poll(async () => (await readPoints(canvas, connectorId)).length, {
			message: `a waypoint is added to segment ${segmentIndex}`,
		})
		.toBe(before + 1);
}

/**
 * Joins two rectangles placed diagonally apart, rightCenter to leftCenter, switches the
 * routing to straight and bends it once, leaving the route [source, w0, target].
 * Both rectangles stay owned by their endpoint, so deleting one of them is what
 * frees that end.
 */
async function buildConnectorWithWaypoint(canvas: CanvasDriver): Promise<{
	connectorId: string;
	sourceRectId: string;
}> {
	const sourceRectId = await canvas.drawShape(
		"Rectangle",
		{ x: 300, y: 180 },
		{ x: 460, y: 280 },
	);
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 820, y: 440 }, { x: 980, y: 540 });
	await canvas.deselect();

	await canvas.selectAt({ x: 380, y: 230 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 820,
		y: 490,
	});
	await canvas.deselect();

	await selectConnector(canvas, connectorId);
	await switchToStraightRouting(canvas, connectorId);

	await insertWaypoint(canvas, connectorId, 0, { x: 560, y: 420 });

	return { connectorId, sourceRectId };
}

/** Clicks a waypoint handle and waits for the fill that says the pick is committed. */
async function pickWaypoint(
	canvas: CanvasDriver,
	connectorId: string,
	waypointIndex: number,
) {
	const selectedFill = await canvas.normalizeColor(SELECTED_FILL);
	await waypointHandle(canvas, connectorId, waypointIndex).click();
	await expect
		.poll(
			() =>
				waypointHandle(canvas, connectorId, waypointIndex).evaluate(
					(el) => getComputedStyle(el).fill,
				),
			{
				message: `waypoint ${waypointIndex} is picked, showing the selection fill`,
			},
		)
		.toBe(selectedFill);
}

test.describe("deleting a picked connector waypoint", () => {
	test("removes the waypoint alone and keeps the connector, and undo puts it back", async ({
		canvas,
	}) => {
		const { connectorId } = await buildConnectorWithWaypoint(canvas);
		const before = await readPoints(canvas, connectorId);
		expect(before).toHaveLength(3);

		await pickWaypoint(canvas, connectorId, 0);
		await canvas.deleteSelection();

		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "the route loses exactly the deleted waypoint",
			})
			.toBe(before.length - 1);
		// The connector itself is still a document object, which is what separates a
		// waypoint deletion from the whole-connector deletion Delete means otherwise.
		expect(
			(await canvas.captureObjects()).some((obj) => obj.id === connectorId),
		).toBe(true);

		await canvas.undo();
		await expect
			.poll(async () => readPoints(canvas, connectorId), {
				message: "undo restores the route it had",
			})
			.toEqual(before);
	});

	test("drops the waypoint pick when the selection moves to a shape, so Delete takes the shape", async ({
		canvas,
	}) => {
		const { connectorId, sourceRectId } =
			await buildConnectorWithWaypoint(canvas);
		const before = await readPoints(canvas, connectorId);

		await pickWaypoint(canvas, connectorId, 0);

		// Moving the selection to the source rectangle clears the pick, since the
		// connector is no longer the sole selection.
		await canvas.selectAt({ x: 380, y: 230 });
		await canvas.deleteSelection();

		await expect
			.poll(
				async () =>
					(await canvas.captureObjects()).some(
						(obj) => obj.id === sourceRectId,
					),
				{ message: "the rectangle is what Delete took" },
			)
			.toBe(false);
		// Only one end lost its shape, so the connector stays with that end frozen
		// where it was drawn (cleanupConnectorsOnDelete): the route is untouched.
		expect(
			(await canvas.captureObjects()).some((obj) => obj.id === connectorId),
		).toBe(true);
		expect(await readPoints(canvas, connectorId)).toEqual(before);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec guarding *sequences* of segment-drag operations at the UI level.
 *
 * connector-segment-drag.spec guards each operation in isolation, but past regressions took the
 * form of "correct on its own, broken when performed in a sequence" (missed cleanup, undo
 * boundaries and the like). Here, with shape moves, undo/redo and routing switches interleaved,
 * this guards that
 * (1) segment drags round-trip exactly through undo/redo,
 * (2) a route folded into an L keeps its shape and right angles across a shape move and a
 *     straight-routing round trip.
 */

type Vec = { x: number; y: number };
const EPS = 1.5;

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

/** Checks that every pair of adjacent vertices is horizontal or vertical (right angles, no degenerate segments). */
function assertOrthogonalSegments(points: Vec[], label: string) {
	for (let i = 1; i < points.length; i++) {
		const horizontal = Math.abs(points[i - 1].y - points[i].y) <= EPS;
		const vertical = Math.abs(points[i - 1].x - points[i].x) <= EPS;
		expect(
			horizontal !== vertical,
			`${label}: segment ${i - 1}->${i} is not at a right angle (duplicated point or diagonal): ${JSON.stringify(points)}`,
		).toBe(true);
	}
}

/** Reads the currently rendered points of the connector. */
async function readPoints(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec[]> {
	return parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
}

/** Selects the connector by clicking the midpoint of its longest segment. */
async function selectConnector(canvas: CanvasDriver, connectorId: string) {
	const points = await readPoints(canvas, connectorId);
	let best = { mid: points[0], length: -1 };
	for (let i = 1; i < points.length; i++) {
		const [a, b] = [points[i - 1], points[i]];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (length > best.length) {
			best = { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, length };
		}
	}
	await canvas.clickAt(best.mid);
	await expect(
		canvas.page.locator('[data-part="toggle:connector-routing"]'),
	).toBeVisible();
}

/** Joins two rectangles placed diagonally apart from rightCenter to leftCenter (same layout as connector-segment-drag.spec). */
async function buildDiagonalConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 180 }, { x: 460, y: 280 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 820, y: 440 }, { x: 980, y: 540 });
	await canvas.deselect();
	await canvas.selectAt({ x: 380, y: 230 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 820,
		y: 490,
	});
	await canvas.deselect();
	return connectorId;
}

test.describe("sequences of segment-drag operations", () => {
	test("round-trips consecutive drags exactly through undo/redo and returns to the automatic route on reset", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		// 1. Move the middle run to the right
		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: mid.x + 130, y: mid.y });
		const afterRun = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(afterRun, "after the run drag");

		// 2. Pull the first segment down (a vertical link adds bends)
		await canvas.drag(
			{ x: (initial[0].x + afterRun[1].x) / 2, y: initial[0].y },
			{ x: (initial[0].x + afterRun[1].x) / 2, y: initial[0].y + 110 },
		);
		const afterEnd = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(afterEnd, "after the end drag");
		expect(afterEnd.length).toBeGreaterThan(afterRun.length);

		// 3. Two undos return exactly to the automatic route, two redos restore it completely
		await canvas.undo();
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length)
			.toBe(afterRun.length);
		await canvas.undo();
		await expect
			.poll(async () => readPoints(canvas, connectorId))
			.toEqual(initial);
		await canvas.redo();
		await canvas.redo();
		await expect
			.poll(async () => readPoints(canvas, connectorId))
			.toEqual(afterEnd);

		// 4. Reset back to the automatic route
		const onLine = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);
		await canvas.openContextMenu({
			x: (onLine[2].x + onLine[3].x) / 2,
			y: (onLine[2].y + onLine[3].y) / 2,
		});
		await canvas.clickContextMenuCommand("resetConnectorRoute");
		await expect
			.poll(async () => readPoints(canvas, connectorId))
			.toEqual(initial);
	});

	test("keeps the shape and right angles of an L-folded route across a shape move, a straight-routing round trip and another move", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		const initial = await readPoints(canvas, connectorId);
		await selectConnector(canvas, connectorId);

		// 1. Overlay the vertical run on the face of the target to fold it into an L (one bend)
		const mid = {
			x: (initial[1].x + initial[2].x) / 2,
			y: (initial[1].y + initial[2].y) / 2,
		};
		await canvas.drag(mid, { x: initial[3].x, y: mid.y });
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length)
			.toBe(3);
		assertOrthogonalSegments(
			await readPoints(canvas, connectorId),
			"after folding into an L",
		);

		// 2. Lowering the source shape keeps the L and its right angles
		await canvas.deselect();
		await canvas.selectAt({ x: 380, y: 230 });
		await canvas.drag({ x: 380, y: 230 }, { x: 380, y: 380 });
		await canvas.deselect();
		const afterMove = await readPoints(canvas, connectorId);
		assertOrthogonalSegments(afterMove, "after the shape move");
		expect(afterMove.length).toBe(3);

		// 3. Switch to straight (baking the route in) and back to orthogonal; the shape is unchanged.
		//    The dropdown stays open after a command, so the second one is pressed without the toggle.
		await selectConnector(canvas, connectorId);
		await canvas.openObjectMenu("connector-routing");
		await canvas.page.click('[data-part="command:setRoutingStraight"]');
		await expect
			.poll(async () => readPoints(canvas, connectorId))
			.toEqual(afterMove);
		await canvas.page.click('[data-part="command:setRoutingOrthogonal"]');
		await expect
			.poll(async () => readPoints(canvas, connectorId))
			.toEqual(afterMove);

		// 4. Moving the target shape as well keeps the right angles
		await canvas.deselect();
		await canvas.selectAt({ x: 900, y: 490 });
		await canvas.drag({ x: 900, y: 490 }, { x: 900, y: 600 });
		await canvas.deselect();
		assertOrthogonalSegments(
			await readPoints(canvas, connectorId),
			"after the target move",
		);
	});
});

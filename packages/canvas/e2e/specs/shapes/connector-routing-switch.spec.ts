import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec verifying, at the UI level, switching connector routing (straight / orthogonal) from the
 * ObjectMenu.
 *
 * connector-routing-geometry.spec only covers the output geometry of the default (orthogonal)
 * routing; switching straight <-> orthogonal through the RoutingMenu (the routing dropdown of the
 * ObjectMenu) and having the rendered route actually change was untested — becoming a single
 * diagonal line for straight, returning to a right-angled polyline for orthogonal, and the current
 * routing being reflected in the highlighted option. This guards the effect of
 * SetConnectorRoutingCommand through real UI operations.
 *
 * The layout uses two shapes placed diagonally apart. There, straight is a 2-vertex diagonal and
 * orthogonal is a right-angled polyline (3 or more vertices), so the two routings are clearly
 * distinguishable geometrically.
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
function assertOrthogonalSegments(points: Vec[]) {
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const cur = points[i];
		const horizontal = Math.abs(prev.y - cur.y) <= EPS;
		const vertical = Math.abs(prev.x - cur.x) <= EPS;
		expect(
			horizontal !== vertical,
			`segment ${i - 1}->${i} is not at a right angle (duplicated point or diagonal): ${JSON.stringify(prev)} -> ${JSON.stringify(cur)}`,
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

/**
 * Selects the connector by clicking a point on the line. The route (and its vertex count) changes
 * with the routing, so the midpoint of the longest segment at that moment is computed from the
 * rendered points and clicked, which lands on the center line of the hit area.
 */
async function selectConnector(canvas: CanvasDriver, connectorId: string) {
	const points = await readPoints(canvas, connectorId);
	let best = { mid: points[0], length: -1 };
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1];
		const b = points[i];
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

/**
 * Opens the RoutingMenu dropdown, doing nothing if it is already open. Clicking a command does not
 * close the dropdown, so pressing the toggle unconditionally would close an open one; the toggle is
 * pressed only when no option is visible.
 */
async function ensureRoutingMenuOpen(canvas: CanvasDriver) {
	const anyOption = canvas.page.locator(
		'[data-part="command:setRoutingStraight"]',
	);
	if (!(await anyOption.isVisible())) {
		await canvas.openObjectMenu("connector-routing");
	}
	await expect(anyOption).toBeVisible();
}

/**
 * Opens the RoutingMenu and presses the option for the given routing. The connector stays selected
 * after the switch, so another routing can be selected right after.
 */
async function setRouting(
	canvas: CanvasDriver,
	routing: "orthogonal" | "straight",
) {
	await ensureRoutingMenuOpen(canvas);
	const commandId =
		routing === "orthogonal" ? "setRoutingOrthogonal" : "setRoutingStraight";
	await canvas.page.click(`[data-part="command:${commandId}"]`);
}

/**
 * Joins two rectangles placed diagonally apart from source rightCenter to target leftCenter and
 * returns the connector id. The target end is dropped on an edge anchor (leftCenter): with both
 * ends being connectPoints the default is orthogonal, which is the premise this spec relies on
 * (dropping on a center would make one endpoint a center anchor, defaulting to straight).
 */
async function buildDiagonalConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 180 }, { x: 460, y: 280 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 820, y: 440 }, { x: 980, y: 540 });
	await canvas.deselect();

	await canvas.selectAt({ x: 380, y: 230 });
	// Drop on the target left edge center (820, 490) -> a leftCenter anchor (an edge has a direction).
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 820,
		y: 490,
	});
	await canvas.deselect();
	return connectorId;
}

test.describe("switching connector routing (ObjectMenu)", () => {
	test("defaults to orthogonal, becomes a diagonal line on straight and returns to right angles on orthogonal", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);

		// The default (routing omitted) is orthogonal. The diagonal layout bends, so there are at
		// least 3 vertices and all segments are at right angles.
		const initial = await readPoints(canvas, connectorId);
		expect(
			initial.length,
			`default routing is a right-angled polyline: ${JSON.stringify(initial)}`,
		).toBeGreaterThanOrEqual(3);
		assertOrthogonalSegments(initial);

		// Switch to straight -> a diagonal of one segment (2 vertices) joining the endpoints directly.
		await selectConnector(canvas, connectorId);
		await setRouting(canvas, "straight");
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "becomes a 2-vertex straight line when switched to straight",
			})
			.toBe(2);

		const straight = await readPoints(canvas, connectorId);
		// The layout is diagonal, so the only segment is neither horizontal nor vertical.
		expect(
			Math.abs(straight[0].x - straight[1].x),
			"straight changes x (not vertical)",
		).toBeGreaterThan(EPS);
		expect(
			Math.abs(straight[0].y - straight[1].y),
			"straight changes y (not horizontal)",
		).toBeGreaterThan(EPS);

		// Switch back to orthogonal -> a right-angled polyline again (3 or more vertices).
		await setRouting(canvas, "orthogonal");
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message:
					"returns to a polyline (3 or more vertices) when switched to orthogonal",
			})
			.toBeGreaterThanOrEqual(3);
		assertOrthogonalSegments(await readPoints(canvas, connectorId));
	});

	test("reflects the current routing in the highlighted option of the RoutingMenu", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		await selectConnector(canvas, connectorId);

		const orthogonalOption = canvas.page.locator(
			'[data-part="command:setRoutingOrthogonal"]',
		);
		const straightOption = canvas.page.locator(
			'[data-part="command:setRoutingStraight"]',
		);

		// The active state shows up in the isActive style of ObjectMenuButton (border-color=accent,
		// transparent when inactive). background also changes on hover, while border-color only
		// changes with active, so the current routing is read from border-color.
		const borderColorOf = (
			locator: ReturnType<typeof canvas.page.locator>,
		): Promise<string> =>
			locator.evaluate((el) => getComputedStyle(el).borderColor);

		// The default is orthogonal, so opening the dropdown shows only orthogonal as active.
		await ensureRoutingMenuOpen(canvas);
		const orthoBorderInitial = await borderColorOf(orthogonalOption);
		const straightBorderInitial = await borderColorOf(straightOption);
		expect(
			orthoBorderInitial,
			`orthogonal is active by default (its border differs from straight): ortho=${orthoBorderInitial} straight=${straightBorderInitial}`,
		).not.toBe(straightBorderInitial);

		// Switch to straight: confirm it applied through points, then that active moved to straight.
		await canvas.page.click('[data-part="command:setRoutingStraight"]');
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "the switch to straight is applied",
			})
			.toBe(2);

		await ensureRoutingMenuOpen(canvas);
		const orthoBorderAfter = await borderColorOf(orthogonalOption);
		const straightBorderAfter = await borderColorOf(straightOption);
		expect(
			straightBorderAfter,
			`straight is active after switching to straight (its border differs from orthogonal): ortho=${orthoBorderAfter} straight=${straightBorderAfter}`,
		).not.toBe(orthoBorderAfter);
		expect(
			orthoBorderAfter,
			`orthogonal becomes inactive: before=${orthoBorderInitial} after=${orthoBorderAfter}`,
		).not.toBe(orthoBorderInitial);
	});

	test("defaults a new connector dropped on a center to straight", async ({
		canvas,
	}) => {
		// Dropping on the *center* of the target makes it a center anchor. A center has no exit
		// direction, which would make an orthogonal route arbitrary, so the default routing at
		// creation is straight (a 2-vertex diagonal). This is the counterpart of the orthogonal
		// default for two edge anchors (buildDiagonalConnector).
		await canvas.drawShape("Rectangle", { x: 300, y: 180 }, { x: 460, y: 280 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 820, y: 440 }, { x: 980, y: 540 });
		await canvas.deselect();

		await canvas.selectAt({ x: 380, y: 230 });
		// Drop on the target center (900, 490) -> a center anchor.
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 900,
			y: 490,
		});
		await canvas.deselect();

		const points = await readPoints(canvas, connectorId);
		expect(
			points.length,
			`a new connector on a center anchor defaults to straight (2 vertices): ${JSON.stringify(points)}`,
		).toBe(2);
		// The layout is diagonal, so the only segment is neither horizontal nor vertical.
		expect(
			Math.abs(points[0].x - points[1].x),
			"straight changes x (not vertical)",
		).toBeGreaterThan(EPS);
		expect(
			Math.abs(points[0].y - points[1].y),
			"straight changes y (not horizontal)",
		).toBeGreaterThan(EPS);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks that the endpoint editing handles of a selected connector sit exactly on the route's
 * endpoints.
 *
 * Selecting a connector puts a reconnect handle on each end
 * (data-id=<id> plus data-part="endpoint:source/target"). A handle offset from its endpoint
 * turns into an interaction bug: grabbing the end of the line misses, or moves something else.
 *
 * Uses a multi-point route (with an elbow) and guards that the centers of the source and target
 * handles coincide with the first and last of the points. At zoom=1 world coordinates equal
 * content coordinates, so the handles' screen boundingBox goes through toContent before it is
 * compared against the points.
 */

type Vec = { x: number; y: number };

const EPS = 2;

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("cannot read the points attribute");
	}
	return attr
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

function distance(a: Vec, b: Vec): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Returns the center of the control matched by the CSS selector in content coordinates (equal to world coordinates at zoom=1) */
async function controlContentCenter(
	canvas: CanvasDriver,
	controlSelector: string,
): Promise<Vec> {
	const loc = canvas.page.locator(controlSelector);
	await expect(loc).toBeVisible();
	const box = await loc.boundingBox();
	if (!box) {
		throw new Error(`cannot read the position of control ${controlSelector}`);
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

test.describe("connector endpoint editing handles", () => {
	test("puts the source and target handles exactly on the route's endpoints", async ({
		canvas,
	}) => {
		// A diagonal layout gives a multi-point route with an elbow, which makes it clear the
		// handles land on the endpoints and not on an intermediate point.
		await canvas.drawShape("Rectangle", { x: 300, y: 180 }, { x: 460, y: 280 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 760, y: 440 }, { x: 960, y: 540 });
		await canvas.deselect();

		// Connecting to the target's left edge center (760,490) gives a leftCenter anchor. Both ends
		// are edge anchors, so routing defaults to orthogonal and the diagonal layout elbows
		// (dropping on the center would give a center anchor, which defaults to straight, 2 vertices).
		await canvas.selectAt({ x: 380, y: 230 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 760,
			y: 490,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		// There is an elbow, so endpoints are distinguishable from intermediate points.
		expect(points.length).toBeGreaterThanOrEqual(3);
		const startPoint = points[0];
		const endPoint = points[points.length - 1];

		// Click the midpoint of the longest segment, which avoids the corners and hits reliably.
		let clickAt = {
			x: (points[0].x + points[1].x) / 2,
			y: (points[0].y + points[1].y) / 2,
		};
		let longest = -1;
		for (let i = 1; i < points.length; i++) {
			const len = distance(points[i - 1], points[i]);
			if (len > longest) {
				longest = len;
				clickAt = {
					x: (points[i - 1].x + points[i].x) / 2,
					y: (points[i - 1].y + points[i].y) / 2,
				};
			}
		}
		await canvas.clickAt(clickAt);

		// The endpoint editing handles appear on both ends.
		const sourceHandle = await controlContentCenter(
			canvas,
			`[data-id="${connectorId}"][data-part="endpoint:source"]`,
		);
		const targetHandle = await controlContentCenter(
			canvas,
			`[data-id="${connectorId}"][data-part="endpoint:target"]`,
		);

		expect(
			distance(sourceHandle, startPoint),
			`the source handle ${JSON.stringify(sourceHandle)} sits on the start point ${JSON.stringify(startPoint)}`,
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(targetHandle, endPoint),
			`the target handle ${JSON.stringify(targetHandle)} sits on the end point ${JSON.stringify(endPoint)}`,
		).toBeLessThanOrEqual(EPS);

		// Guards against a mix-up: the two handles are far apart, on different ends.
		expect(
			distance(sourceHandle, targetHandle),
			"the source and target handles are on different ends",
		).toBeGreaterThan(50);
	});
});

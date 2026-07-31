import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Checks at the geometry level that an arrow's rotation follows its end segment.
 *
 * An arrow is drawn with its tip at the endpoint, rotated along the end segment that runs
 * toward the adjacent point (Connector.tsx startAngleRadians / endAngleRadians =
 * calcVectorAngleRad(...)). The arrow polygon is placed with matrix(sx·cosθ, sx·sinθ, …, x, y),
 * so the rotation θ=atan2(b,a) and the tip (e,f) can be read back from the matrix.
 *
 * The layout forms an L (the start exits straight down with an upward arrow, the end enters
 * horizontally with a rightward arrow), and for each end this guards that
 *   - the tip coincides with the endpoint
 *   - the rotation matches the actual outward end-segment direction
 * The two ends use different axes, so mixing them up (using the end angle for the start) is
 * also caught.
 */

type Vec = { x: number; y: number };
type ArrowMatrix = { a: number; b: number; tip: Vec };

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

/** Absolute difference of two angles, normalized to [-π, π] (radians) */
function angleDiff(a: number, b: number): number {
	let d = a - b;
	while (d > Math.PI) {
		d -= 2 * Math.PI;
	}
	while (d < -Math.PI) {
		d += 2 * Math.PI;
	}
	return Math.abs(d);
}

/** Reads the matrix (a, b and the tip e, f) of every arrow polygon of a connector */
async function readArrows(
	canvas: CanvasDriver,
	id: string,
): Promise<ArrowMatrix[]> {
	return canvas.page.evaluate((cid) => {
		return [
			...document.querySelectorAll(
				`polygon[data-kind="connector"][data-id="${cid}"]`,
			),
		].map((poly) => {
			const matched = (poly.getAttribute("transform") ?? "").match(
				/matrix\(([^)]+)\)/,
			);
			const nums = matched ? matched[1].split(",").map(Number) : [];
			return { a: nums[0], b: nums[1], tip: { x: nums[4], y: nums[5] } };
		});
	}, id);
}

/** Returns the arrow whose tip is nearest to the endpoint */
function arrowNearest(arrows: ArrowMatrix[], endpoint: Vec): ArrowMatrix {
	let best = arrows[0];
	let bestDist = Infinity;
	for (const arrow of arrows) {
		const d = distance(arrow.tip, endpoint);
		if (d < bestDist) {
			bestDist = d;
			best = arrow;
		}
	}
	return best;
}

/** Selects the connector by clicking near the line midpoint and waits for the arrow menu */
async function selectConnector(canvas: CanvasDriver, at: Vec) {
	await canvas.clickAt(at);
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("arrow-head-end")),
	).toBeVisible();
}

test.describe("connector arrow direction", () => {
	test("rotates each arrow to match the outward direction of its end segment", async ({
		canvas,
	}) => {
		// source is top-left, target is bottom-right. source bottomCenter (exits downward) →
		// target leftCenter (enters horizontally from the left) gives an L-shaped route.
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 400 }, { x: 900, y: 500 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 715,
			y: 450,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		expect(points.length).toBeGreaterThanOrEqual(2);

		const start = points[0];
		const end = points[points.length - 1];
		const afterStart = points[1];
		const beforeEnd = points[points.length - 2];

		// By default only the end carries an arrow.
		const endArrow = arrowNearest(await readArrows(canvas, connectorId), end);
		expect(
			distance(endArrow.tip, end),
			"end arrow tip coincides with the end point",
		).toBeLessThanOrEqual(1.5);
		// Outward direction is beforeEnd → end.
		const endArrowAngle = Math.atan2(endArrow.b, endArrow.a);
		const endSegmentAngle = Math.atan2(
			end.y - beforeEnd.y,
			end.x - beforeEnd.x,
		);
		expect(
			angleDiff(endArrowAngle, endSegmentAngle),
			`end arrow angle ${endArrowAngle.toFixed(3)} matches end-segment direction ${endSegmentAngle.toFixed(3)}`,
		).toBeLessThanOrEqual(0.05);

		// Add an arrow at the start as well and check it follows its own outward direction.
		await selectConnector(canvas, {
			x: start.x,
			y: (start.y + afterStart.y) / 2,
		});
		await canvas.openObjectMenu("arrow-head-start");
		await canvas.page.click(
			selectors.objectMenuSet("startArrow", "FilledTriangle"),
		);
		await canvas.deselect();

		const startArrow = arrowNearest(
			await readArrows(canvas, connectorId),
			start,
		);
		expect(
			distance(startArrow.tip, start),
			"start arrow tip coincides with the start point",
		).toBeLessThanOrEqual(1.5);
		// Outward direction is afterStart → start.
		const startArrowAngle = Math.atan2(startArrow.b, startArrow.a);
		const startSegmentAngle = Math.atan2(
			start.y - afterStart.y,
			start.x - afterStart.x,
		);
		expect(
			angleDiff(startArrowAngle, startSegmentAngle),
			`start arrow angle ${startArrowAngle.toFixed(3)} matches end-segment direction ${startSegmentAngle.toFixed(3)}`,
		).toBeLessThanOrEqual(0.05);

		// The L shape puts the start (vertical) and end (horizontal) on different axes, so a
		// mix-up between them shows up here.
		expect(
			angleDiff(startArrowAngle, endArrowAngle),
			"start and end arrows point in different directions (L-shaped layout)",
		).toBeGreaterThan(1.0);
	});
});

import { test, expect } from "../../fixtures";

/**
 * Checks through Zoom to Fit framing that an orthogonal connector's bounding box includes its
 * bend points (waypoints) — a regression guard for fix #77.
 *
 * calcConnectorBoundingBox used to take its extent from the endpoints and manual points only,
 * ignoring the bend points that orthogonal routing computes at draw time, which left the bends
 * of a connector that loops around clipped off screen after Zoom to Fit. The fix itself is
 * guarded by a unit test (see calcConnectorBoundingBox.test).
 *
 * Builds a U-turn route that reaches beyond the x span of the endpoints and guards that after
 * Zoom to Fit every drawn point, bends included, lies inside the viewBox. If the bbox drops the
 * bend points, that point falls outside the viewBox and the test fails.
 */

type Vec = { x: number; y: number };
type ViewBox = { minX: number; minY: number; width: number; height: number };

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

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

test.describe("connector bounding box including bend points", () => {
	test("fits the bends of a looping orthogonal connector inside the frame on Zoom to Fit", async ({
		canvas,
	}) => {
		// A wide, short layout makes width the constraining axis for Zoom to Fit, so horizontal
		// clipping is easy to detect (vertical slack, horizontal fit plus padding).
		// source on the right and target on the left: leaving source at rightCenter exits to the
		// right, then U-turns back to the target, putting a bend outside the endpoint span.
		await canvas.drawShape("Rectangle", { x: 520, y: 360 }, { x: 640, y: 440 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 260, y: 360 }, { x: 380, y: 440 });
		await canvas.deselect();

		// Dropping from source rightCenter onto the target's right edge center (380,400) forces the
		// loop. Both ends are edge anchors, so routing defaults to orthogonal (dropping on the
		// center would give a center anchor, which defaults to straight and never bends).
		await canvas.selectAt({ x: 580, y: 400 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 380,
			y: 400,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);

		// Precondition: the U-turn pushes a bend to the right of the endpoints' x span, so the
		// layout really is one that clips when the bbox ignores bend points.
		const endpointMaxX = Math.max(points[0].x, points[points.length - 1].x);
		const routeMaxX = Math.max(...points.map((p) => p.x));
		expect(
			routeMaxX,
			`a bend reaches beyond the endpoint span: endpointMaxX=${endpointMaxX} routeMaxX=${routeMaxX}`,
		).toBeGreaterThan(endpointMaxX + 1);

		const before = await canvas.getViewBox();
		await canvas.zoomToFit();
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "Zoom to Fit changes the viewBox",
			})
			.not.toBe(before);

		const vb = parseViewBox(await canvas.getViewBox());

		// Taking the bbox from the endpoints alone puts the right-hand bend outside the viewBox,
		// which fails here.
		const TOL = 1; // rounding error
		for (const [i, p] of points.entries()) {
			expect(
				p.x >= vb.minX - TOL && p.x <= vb.minX + vb.width + TOL,
				`point ${i} ${JSON.stringify(p)} lies within the viewBox x range [${vb.minX}, ${vb.minX + vb.width}]`,
			).toBe(true);
			expect(
				p.y >= vb.minY - TOL && p.y <= vb.minY + vb.height + TOL,
				`point ${i} ${JSON.stringify(p)} lies within the viewBox y range [${vb.minY}, ${vb.minY + vb.height}]`,
			).toBe(true);
		}
	});
});

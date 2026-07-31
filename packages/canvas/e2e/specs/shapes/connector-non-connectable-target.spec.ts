import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec for dropping a connector endpoint onto a shape that cannot be connected
 * (connectable=false): no connection is made.
 *
 * Only connectable types are drop candidates for an endpoint (findConnectableHoverTarget filters
 * by features.connectable). rect/ellipse/sticky are connectable; polyline/polygon/group/connector
 * are connectable=false. Existing specs only used connectable targets, so this filter was untested.
 *
 * To tell the two apart, the drop lands on a point *away from the center* of the Polyline:
 *   - staying free correctly leaves the endpoint at the drop coordinate
 *   - a wrong connection would snap the endpoint to the Polyline center (its nearest anchor)
 * content->world is derived from the drawing coordinates and the actual AABB of the source shape
 * (zoom=1).
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 2;

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

function distance(a: Vec, b: Vec): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

async function worldAABB(canvas: CanvasDriver, id: string): Promise<AABB> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`shape ${targetId} is not an SVGGraphicsElement`);
		}
		const bbox = el.getBBox();
		const ctm = el.getCTM();
		if (!ctm) {
			throw new Error(`CTM of shape ${targetId} is not available`);
		}
		const corners = [
			{ x: bbox.x, y: bbox.y },
			{ x: bbox.x + bbox.width, y: bbox.y },
			{ x: bbox.x, y: bbox.y + bbox.height },
			{ x: bbox.x + bbox.width, y: bbox.y + bbox.height },
		].map((p) => ({
			x: p.x * ctm.a + p.y * ctm.c + ctm.e,
			y: p.x * ctm.b + p.y * ctm.d + ctm.f,
		}));
		const xs = corners.map((corner) => corner.x);
		const ys = corners.map((corner) => corner.y);
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys),
		};
	}, id);
}

test.describe("no connection to a non-connectable shape", () => {
	test("leaves the endpoint free when dropped onto a Polyline", async ({
		canvas,
	}) => {
		// Content drawing coordinates of the source, used to derive the content->world offset.
		const srcContent = { minX: 150, minY: 300, maxX: 310, maxY: 400 };
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: srcContent.minX, y: srcContent.minY },
			{ x: srcContent.maxX, y: srcContent.maxY },
		);
		await canvas.deselect();

		// Draw a horizontal Polyline (connectable=false) on the right. Its center is (800,350).
		await canvas.drawShape("Polyline", { x: 700, y: 350 }, { x: 900, y: 350 });
		await canvas.deselect();

		// Drop from rightCenter onto (860,350), a point away from the Polyline center.
		const dropContent = { x: 860, y: 350 };
		await canvas.selectAt({ x: 230, y: 350 });
		const connectorId = await canvas.createConnector(
			"rightCenter",
			dropContent,
		);
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);

		// content->world offset (a pure translation, since zoom=1 and there is no pan).
		const offsetX = sourceBox.minX - srcContent.minX;
		const offsetY = sourceBox.minY - srcContent.minY;
		const dropWorld = {
			x: dropContent.x + offsetX,
			y: dropContent.y + offsetY,
		};
		const polylineCenterWorld = { x: 800 + offsetX, y: 350 + offsetY };

		const endpoint = points[points.length - 1];

		// Being free, the endpoint stays at the drop coordinate (not snapped to the Polyline).
		expect(
			distance(endpoint, dropWorld),
			`end point ${JSON.stringify(endpoint)} stays at the drop coordinate ${JSON.stringify(dropWorld)} (free)`,
		).toBeLessThanOrEqual(EPS);
		// Clearly away from the Polyline center, where a wrong connection would put it.
		expect(
			distance(endpoint, polylineCenterWorld),
			"end point is not snapped to the Polyline center (the connectable filter applies)",
		).toBeGreaterThan(20);

		// Moving the Polyline does not drag the connector along (= not connected). Grab the
		// Polyline at (880,350), which does not overlap the connector line (it ends around x860).
		const before = await canvas.objectById(connectorId).getAttribute("points");
		await canvas.drag({ x: 880, y: 350 }, { x: 880, y: 560 });
		expect(
			await canvas.objectById(connectorId).getAttribute("points"),
			"connector does not follow when the Polyline moves",
		).toBe(before);
	});
});

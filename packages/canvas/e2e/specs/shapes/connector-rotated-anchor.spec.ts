import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec verifying, at the geometry level, that edge anchors follow a *rotated* source shape.
 *
 * A connectPoint anchor (an edge center) is resolved with rotation applied by calcConnectPoint, so
 * rotating a shape moves the connector endpoint to the midpoint of the rotated edge. That is a
 * different point from the edge center of the AABB (axis-aligned bounding box): the midpoint of a
 * rotated edge falls inside the AABB.
 *
 * connector-follow-rotate.spec only checks that points change on rotation and that following still
 * works; whether the endpoint lands *exactly* on the rotated edge anchor was untested. Here the
 * connector endpoint is compared with the edge midpoint obtained by transforming the local bbox of
 * the shape through its CTM (rotation included). Expected values are built from the rendered shape,
 * so this does not depend on coordinate offsets.
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 1.5;

/** Parses "x1,y1 x2,y2 ..." into an array of coordinates. */
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

/**
 * Returns the midpoint of the bottom edge of a shape (data-id) in world coordinates. The local
 * bbox bottom midpoint (x + w/2, y + h) is transformed through the CTM (rotation included), so for
 * a rotated shape this is the midpoint of the rotated edge.
 */
async function worldBottomCenter(
	canvas: CanvasDriver,
	id: string,
): Promise<Vec> {
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
		const local = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height };
		return {
			x: local.x * ctm.a + local.y * ctm.c + ctm.e,
			y: local.x * ctm.b + local.y * ctm.d + ctm.f,
		};
	}, id);
}

/** World AABB of a shape (data-id): min/max of the four local bbox corners transformed by the CTM. */
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
		const xs = corners.map((c) => c.x);
		const ys = corners.map((c) => c.y);
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys),
		};
	}, id);
}

const centerX = (box: AABB): number => (box.minX + box.maxX) / 2;

/** Joins two stacked rectangles from bottomCenter to the lower one; returns the source and connector ids. */
async function buildPair(
	canvas: CanvasDriver,
): Promise<{ sourceId: string; connectorId: string }> {
	const sourceId = await canvas.drawShape(
		"Rectangle",
		{ x: 400, y: 150 },
		{ x: 600, y: 250 },
	);
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 450,
	});
	await canvas.deselect();
	return { sourceId, connectorId };
}

test.describe("anchor following on a rotated source shape", () => {
	test("connector start point sits exactly on the midpoint of the rotated bottom edge", async ({
		canvas,
	}) => {
		const { sourceId, connectorId } = await buildPair(canvas);

		const pointsAttr = () =>
			canvas.objectById(connectorId).getAttribute("points");
		const before = await pointsAttr();

		// Before rotation the shape is axis-aligned, so bottomCenter equals the AABB bottom center.
		const startBefore = parsePoints(before)[0];
		const aabbBefore = await worldAABB(canvas, sourceId);
		expect(
			distance(startBefore, { x: centerX(aabbBefore), y: aabbBefore.maxY }),
			"start point sits on the AABB bottom edge center before rotation",
		).toBeLessThanOrEqual(EPS);

		// Rotate the source shape (center 500,200), swinging the rotation handle sideways to tilt
		// it clearly.
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.dragTransformHandle("rotation", { x: 640, y: 150 });
		await canvas.deselect();

		// Wait until the rotation is applied and points change.
		await expect
			.poll(pointsAttr, { message: "connector follows the rotation" })
			.not.toBe(before);

		const startAfter = parsePoints(await pointsAttr())[0];
		const rotatedBottomCenter = await worldBottomCenter(canvas, sourceId);
		const aabbAfter = await worldAABB(canvas, sourceId);

		expect(
			distance(startAfter, rotatedBottomCenter),
			`start point ${JSON.stringify(startAfter)} sits on the rotated bottom edge midpoint ${JSON.stringify(rotatedBottomCenter)}`,
		).toBeLessThanOrEqual(EPS);

		// The rotated edge midpoint differs from the AABB bottom center and lies inside the AABB
		// (above the bottom edge); this is what lets the test catch a regression that resolves the
		// anchor on the AABB edge and ignores rotation.
		const aabbBottomCenterAfter = { x: centerX(aabbAfter), y: aabbAfter.maxY };
		expect(
			distance(rotatedBottomCenter, aabbBottomCenterAfter),
			"rotated edge midpoint is far enough from the AABB bottom edge center (rotation applies)",
		).toBeGreaterThan(8);
		expect(
			startAfter.y,
			"start point after rotation is inside the AABB (above its bottom edge)",
		).toBeLessThan(aabbAfter.maxY - EPS);
	});
});

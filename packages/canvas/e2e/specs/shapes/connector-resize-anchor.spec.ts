import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec verifying, at the geometry level, that connector endpoints follow when a connected shape is
 * *resized*.
 *
 * An endpoint resolves to an edge anchor of the connected shape (bottomCenter and so on), so when
 * a resize moves that edge, the endpoint moves to the new edge center. connector-follow-resize.spec
 * only checks that points change on a resize; whether the endpoint lands exactly on the edge center
 * *after* the resize was untested.
 *
 * For an endpoint connected at bottomCenter, this guards that
 *   - extending the bottom edge downwards makes the endpoint y follow the resized bottom edge center
 *   - extending the right edge to the right (shifting the center x) makes the endpoint x follow it too
 * Expected values are built from the shape geometry after the resize, so this does not depend on
 * coordinate offsets.
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 1.5;

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

const bottomCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.maxY,
});

test.describe("connector endpoint following on resize", () => {
	test("endpoint follows exactly to the new bottom edge center when the source shape is resized", async ({
		canvas,
	}) => {
		// A source above (center 500,200) and a target below, connected at the source bottomCenter.
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

		const startPoint = () =>
			canvas
				.objectById(connectorId)
				.getAttribute("points")
				.then((attr) => parsePoints(attr)[0]);
		const pointsAttr = () =>
			canvas.objectById(connectorId).getAttribute("points");

		const initialBox = await worldAABB(canvas, sourceId);
		const initialBottomCenter = bottomCenter(initialBox);
		expect(
			distance(await startPoint(), initialBottomCenter),
			"endpoint initially sits on the bottom edge center",
		).toBeLessThanOrEqual(EPS);

		// -- Extend the bottom edge downwards (vertical following) --
		const beforeResize1 = await pointsAttr();
		await canvas.selectAt({ x: 500, y: 200 });
		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: 500, y: 340 },
			{ ctrl: true },
		);
		await expect
			.poll(pointsAttr, {
				message: "endpoint follows the bottom edge resize",
			})
			.not.toBe(beforeResize1);

		const box1 = await worldAABB(canvas, sourceId);
		const bottomCenter1 = bottomCenter(box1);
		// The bottom edge really moved down, so the following assertion is not vacuous.
		expect(bottomCenter1.y, "bottom edge extended downwards").toBeGreaterThan(
			initialBottomCenter.y + 20,
		);
		expect(
			distance(await startPoint(), bottomCenter1),
			`endpoint ${JSON.stringify(await startPoint())} sits on the new bottom edge center ${JSON.stringify(bottomCenter1)}`,
		).toBeLessThanOrEqual(EPS);

		// -- Extend the right edge to the right (center x shifts, horizontal following) --
		const beforeResize2 = await pointsAttr();
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 740, y: box1.minY + (box1.maxY - box1.minY) / 2 },
			{ ctrl: true },
		);
		await expect
			.poll(pointsAttr, { message: "endpoint follows the right edge resize" })
			.not.toBe(beforeResize2);

		const box2 = await worldAABB(canvas, sourceId);
		const bottomCenter2 = bottomCenter(box2);
		expect(
			bottomCenter2.x,
			"x of the bottom edge center moves right on the right edge resize",
		).toBeGreaterThan(bottomCenter1.x + 20);
		expect(
			distance(await startPoint(), bottomCenter2),
			`endpoint ${JSON.stringify(await startPoint())} sits on the new bottom edge center ${JSON.stringify(bottomCenter2)}`,
		).toBeLessThanOrEqual(EPS);
	});
});

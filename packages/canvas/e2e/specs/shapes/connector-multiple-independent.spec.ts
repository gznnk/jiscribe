import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec for independent following and anchor resolution when several connectors attach to one shape.
 *
 * The other connector-following specs all use one connector per shape; a hub shape carrying
 * several connectors on different anchors (topCenter / bottomCenter) was untested.
 *
 * T1 (top) / hub / T2 (bottom) are joined by two connectors on topCenter / bottomCenter, and this
 * guards that
 *   - each start point sits exactly on its own edge center of the hub
 *   - moving the hub makes both follow to the new edge centers
 *   - moving only T1 changes c1 and leaves c2 unchanged
 * Expected values are built from the rendered shapes, so this does not depend on coordinate offsets.
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

const topCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.minY,
});
const bottomCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.maxY,
});

async function startPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	return parsePoints(await canvas.objectById(id).getAttribute("points"))[0];
}

test.describe("multiple connectors on a hub shape", () => {
	test("follows from each anchor when the hub moves, and moving one peer does not affect the other", async ({
		canvas,
	}) => {
		// Stack T1 (top) / hub / T2 (bottom) vertically.
		await canvas.drawShape("Rectangle", { x: 400, y: 100 }, { x: 600, y: 180 });
		await canvas.deselect();
		const hubId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 330 },
			{ x: 600, y: 430 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 400, y: 560 }, { x: 600, y: 640 });
		await canvas.deselect();

		// c1: hub topCenter -> T1. c2: hub bottomCenter -> T2.
		await canvas.selectAt({ x: 500, y: 380 });
		const c1 = await canvas.createConnector("topCenter", { x: 500, y: 175 });
		await canvas.deselect();
		await canvas.selectAt({ x: 500, y: 380 });
		const c2 = await canvas.createConnector("bottomCenter", { x: 500, y: 565 });
		await canvas.deselect();

		// Both start points sit exactly on separate edge centers of the hub.
		const hub0 = await worldAABB(canvas, hubId);
		expect(
			distance(await startPoint(canvas, c1), topCenter(hub0)),
			"start point of c1 sits on the top edge center of the hub",
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(await startPoint(canvas, c2), bottomCenter(hub0)),
			"start point of c2 sits on the bottom edge center of the hub",
		).toBeLessThanOrEqual(EPS);

		// -- Move the hub to the right: both follow to the new edge centers --
		await canvas.drag({ x: 500, y: 380 }, { x: 760, y: 380 });
		await expect
			.poll(async () => (await startPoint(canvas, c1)).x, {
				message: "start point of c1 follows the hub move",
			})
			.toBeGreaterThan(topCenter(hub0).x + 100);

		const hub1 = await worldAABB(canvas, hubId);
		expect(
			distance(await startPoint(canvas, c1), topCenter(hub1)),
			"start point of c1 sits on the top edge center of the moved hub",
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(await startPoint(canvas, c2), bottomCenter(hub1)),
			"start point of c2 sits on the bottom edge center of the moved hub",
		).toBeLessThanOrEqual(EPS);

		// -- Move only T1: c1 changes, c2 stays unchanged --
		const c1Before = await canvas.objectById(c1).getAttribute("points");
		const c2Before = await canvas.objectById(c2).getAttribute("points");
		await canvas.drag({ x: 500, y: 140 }, { x: 800, y: 140 });
		await expect
			.poll(() => canvas.objectById(c1).getAttribute("points"), {
				message: "c1 changes when T1 moves",
			})
			.not.toBe(c1Before);
		expect(
			await canvas.objectById(c2).getAttribute("points"),
			"moving T1 does not affect c2",
		).toBe(c2Before);
	});
});

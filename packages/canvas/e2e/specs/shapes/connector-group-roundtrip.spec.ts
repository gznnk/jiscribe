import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks that grouping and ungrouping connected shapes leaves the connector in place and the
 * connection alive.
 *
 * Grouping nests the shapes under the group transform and ungrouping folds it back. Neither
 * changes the shapes' world positions, so the connector endpoints must not move either. Getting
 * the transform composition wrong makes the line jump the moment the group forms, or breaks the
 * connection on ungroup (see connector-follow-group-move for moving the group itself).
 *
 * Groups A (with an unrelated C) and ungroups it while A→B is connected, guarding that the
 * endpoints hold still at each stage and that the start follows again when A is moved afterward.
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

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

async function worldAABB(canvas: CanvasDriver, id: string): Promise<AABB> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`shape ${targetId} is not an SVGGraphicsElement`);
		}
		const bbox = el.getBBox();
		const ctm = el.getCTM();
		if (!ctm) {
			throw new Error(`cannot read the CTM of shape ${targetId}`);
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

const bottomCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.maxY,
});

async function endpoints(
	canvas: CanvasDriver,
	id: string,
): Promise<{ start: Vec; end: Vec }> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return { start: points[0], end: points[points.length - 1] };
}

test.describe("connector across a group round trip", () => {
	test("holds the endpoints still through grouping and ungrouping and still follows afterward", async ({
		canvas,
	}) => {
		const aId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 150 },
			{ x: 460, y: 250 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 600, y: 150 }, { x: 760, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 300, y: 450 }, { x: 460, y: 550 });
		await canvas.deselect();

		await canvas.selectAt({ x: 380, y: 200 });
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 380,
			y: 455,
		});
		await canvas.deselect();

		const initial = await endpoints(canvas, connectorId);

		// Group A and C, which leaves A's world position unchanged.
		await canvas.selectAt({ x: 380, y: 200 });
		await canvas.ctrlClickAt({ x: 680, y: 200 });
		await canvas.group();
		await canvas.deselect();

		const afterGroup = await endpoints(canvas, connectorId);
		expect(
			distance(afterGroup.start, initial.start),
			"the start point does not move on grouping",
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(afterGroup.end, initial.end),
			"the end point does not move on grouping",
		).toBeLessThanOrEqual(EPS);

		// Ungroup, which likewise leaves A's world position unchanged.
		await canvas.selectAt({ x: 380, y: 200 });
		await canvas.ungroup();
		await canvas.deselect();

		const afterUngroup = await endpoints(canvas, connectorId);
		expect(
			distance(afterUngroup.start, initial.start),
			"the start point does not move on ungrouping",
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(afterUngroup.end, initial.end),
			"the end point does not move on ungrouping",
		).toBeLessThanOrEqual(EPS);

		// The connection is still alive, so moving A afterward drags the start.
		await canvas.drag({ x: 380, y: 200 }, { x: 580, y: 200 });
		await expect
			.poll(async () => (await endpoints(canvas, connectorId)).start.x, {
				message: "the start point follows when A is moved after ungrouping",
			})
			.toBeGreaterThan(initial.start.x + 100);

		const aAfter = await worldAABB(canvas, aId);
		const finalStart = (await endpoints(canvas, connectorId)).start;
		expect(
			distance(finalStart, bottomCenter(aAfter)),
			"the start point still lies on A's bottom edge center after the post-ungroup move",
		).toBeLessThanOrEqual(EPS);
	});
});

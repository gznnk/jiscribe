import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Creating a connector while the viewBox origin is panned must still resolve the
 * endpoints to the correct world coordinates (the shape edges).
 *
 * connector-anchor-under-zoom.spec covers creation under a viewBox *scale*
 * (zoom); creation under a viewBox *origin shift* (pan) is a separate path. If
 * the pan translation does not enter the screen->world conversion, endpoints of
 * a connector created after panning drift off the edge.
 *
 * Shapes are addressed through their current screen boundingBox fed to
 * toContent, so the interaction lands on the real on-screen position even after
 * panning. Expected endpoints come from a world AABB derived from the element's
 * transform attribute (the model transform, which pan does not affect).
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

/**
 * World AABB of a shape, computed from the element's transform attribute (the
 * local->world model transform). getCTM folds in the viewBox (pan/zoom), so it
 * disagrees with world coordinates once the viewport is moved.
 */
async function worldAABB(canvas: CanvasDriver, id: string): Promise<AABB> {
	return canvas.page.evaluate((targetId) => {
		const el = document.querySelector(`[data-id="${targetId}"]`);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`shape ${targetId} is not an SVGGraphicsElement`);
		}
		const bbox = el.getBBox();
		const matched = (el.getAttribute("transform") ?? "").match(
			/matrix\(([^)]+)\)/,
		);
		const [a, b, c, d, e, f] = matched
			? matched[1].split(",").map(Number)
			: [1, 0, 0, 1, 0, 0];
		const corners = [
			{ x: bbox.x, y: bbox.y },
			{ x: bbox.x + bbox.width, y: bbox.y },
			{ x: bbox.x, y: bbox.y + bbox.height },
			{ x: bbox.x + bbox.width, y: bbox.y + bbox.height },
		].map((p) => ({
			x: p.x * a + p.y * c + e,
			y: p.x * b + p.y * d + f,
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

const centerX = (box: AABB): number => (box.minX + box.maxX) / 2;

function onPerimeter(p: Vec, box: AABB): boolean {
	const onVerticalEdge =
		(Math.abs(p.x - box.minX) <= EPS || Math.abs(p.x - box.maxX) <= EPS) &&
		p.y >= box.minY - EPS &&
		p.y <= box.maxY + EPS;
	const onHorizontalEdge =
		(Math.abs(p.y - box.minY) <= EPS || Math.abs(p.y - box.maxY) <= EPS) &&
		p.x >= box.minX - EPS &&
		p.x <= box.maxX + EPS;
	return onVerticalEdge || onHorizontalEdge;
}

/** Shape center in content coordinates (screen boundingBox through toContent, so it lands on the real screen position even when panned) */
async function contentCenter(canvas: CanvasDriver, id: string): Promise<Vec> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot read the boundingBox of shape ${id}`);
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

/** Origin (x,y) of the viewBox */
async function viewBoxOrigin(canvas: CanvasDriver): Promise<Vec> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [x, y] = raw.trim().split(/\s+/).map(Number);
	return { x, y };
}

test.describe("connector creation under pan", () => {
	test("resolves endpoints exactly onto the shape edges when created after panning", async ({
		canvas,
	}) => {
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 300 },
		);
		await canvas.deselect();
		const targetId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 450 },
			{ x: 600, y: 550 },
		);
		await canvas.deselect();

		// Pan the viewport with a right-button drag.
		const originBefore = await viewBoxOrigin(canvas);
		await canvas.rightDrag({ x: 650, y: 400 }, { x: 740, y: 480 });
		await expect
			.poll(
				async () => {
					const o = await viewBoxOrigin(canvas);
					return distance(o, originBefore);
				},
				{ message: "the pan moves the viewBox origin" },
			)
			.toBeGreaterThan(20);

		// Select source at its current post-pan screen position, then drag from bottomCenter to target.
		await canvas.selectAt(await contentCenter(canvas, sourceId));
		const connectorId = await canvas.createConnector(
			"bottomCenter",
			await contentCenter(canvas, targetId),
		);
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);
		const targetBox = await worldAABB(canvas, targetId);

		// The start point lands exactly on the middle of source's bottom edge in world
		// coordinates, i.e. the pan translation entered the conversion correctly.
		expect(
			distance(points[0], { x: centerX(sourceBox), y: sourceBox.maxY }),
			`start point ${JSON.stringify(points[0])} sits on the middle of source's bottom edge (under pan)`,
		).toBeLessThanOrEqual(EPS);

		expect(
			onPerimeter(points[points.length - 1], targetBox),
			`end point ${JSON.stringify(points[points.length - 1])} sits on target's perimeter (under pan)`,
		).toBe(true);

		// Every segment is axis-aligned.
		for (let i = 1; i < points.length; i++) {
			const horizontal = Math.abs(points[i - 1].y - points[i].y) <= EPS;
			const vertical = Math.abs(points[i - 1].x - points[i].x) <= EPS;
			expect(
				horizontal !== vertical,
				`segment ${i - 1}->${i} is axis-aligned`,
			).toBe(true);
		}
	});
});

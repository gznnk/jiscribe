import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec for re-anchoring an endpoint to a *different edge* of the same shape.
 *
 * connector-reconnect.spec covers swapping the owner of an endpoint (the connected shape itself)
 * to another shape, but keeping the same owner and changing only the connected edge (anchor) was
 * untested — for example moving target from topCenter to rightCenter of B. If replacing the anchor
 * id does not take effect, dropping the endpoint handle on another edge leaves it stuck on the old
 * edge.
 *
 * Drags the target endpoint handle from the top edge center of B to its right edge center, and
 * checks against the actual shape geometry that the endpoint moves to the right edge center and
 * still follows B.
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

const topCenter = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: box.minY,
});
const rightCenter = (box: AABB): Vec => ({
	x: box.maxX,
	y: (box.minY + box.maxY) / 2,
});

async function endPoint(canvas: CanvasDriver, id: string): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(id).getAttribute("points"),
	);
	return points[points.length - 1];
}

/** Drags from the center of the control (a CSS selector) to the content coordinate `to`. */
async function dragControlTo(
	canvas: CanvasDriver,
	controlSelector: string,
	to: Vec,
) {
	const control = canvas.page.locator(controlSelector);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`position of control ${controlSelector} is not available`);
	}
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		12,
	);
}

test.describe("re-anchoring to another edge of the same shape", () => {
	test("moves the endpoint to the right edge center when the target endpoint is re-anchored from the top edge of B to its right edge", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 450 },
			{ x: 600, y: 550 },
		);
		await canvas.deselect();

		// A.bottomCenter -> B.topCenter (dropped on the top edge center of B).
		await canvas.selectAt({ x: 500, y: 200 });
		const id = await canvas.createConnector("bottomCenter", { x: 500, y: 455 });
		await canvas.deselect();

		const bBox = await worldAABB(canvas, bId);
		expect(
			distance(await endPoint(canvas, id), topCenter(bBox)),
			"initial target sits on the top edge center of B",
		).toBeLessThanOrEqual(EPS);

		// Select the connector (a vertical line with both ends owned) to show the target handle.
		await canvas.clickAt({ x: 500, y: 350 });
		await expect(
			canvas.page.locator(`[data-id="${id}"][data-part="endpoint:target"]`),
		).toBeVisible();

		// Drag the target handle near the right edge center of B -> re-anchors to rightCenter.
		await dragControlTo(
			canvas,
			`[data-id="${id}"][data-part="endpoint:target"]`,
			{
				x: 590,
				y: 500,
			},
		);
		await canvas.deselect();

		const movedEnd = await endPoint(canvas, id);
		expect(
			distance(movedEnd, rightCenter(bBox)),
			`target ${JSON.stringify(movedEnd)} moves to the right edge center of B ${JSON.stringify(rightCenter(bBox))}`,
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(movedEnd, topCenter(bBox)),
			"target is away from the original top edge center",
		).toBeGreaterThan(20);

		// Still connected to B: it keeps following at the right edge center when B moves.
		await canvas.drag({ x: 500, y: 500 }, { x: 760, y: 500 });
		await expect
			.poll(async () => (await endPoint(canvas, id)).x, {
				message: "still follows B after re-anchoring",
			})
			.toBeGreaterThan(rightCenter(bBox).x + 100);
		const bMoved = await worldAABB(canvas, bId);
		expect(
			distance(await endPoint(canvas, id), rightCenter(bMoved)),
			"target still sits on the right edge center of the moved B",
		).toBeLessThanOrEqual(EPS);
	});
});

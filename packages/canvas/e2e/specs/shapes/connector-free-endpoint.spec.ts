import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks a connector with one free endpoint at the geometry level.
 *
 * Dropping a connector endpoint on empty space fixes it as a free anchor (kind="free", absolute
 * coordinates). Unlike an owned endpoint on a shape's edge, a free endpoint
 *   - does not snap to a shape and stays exactly at the drop coordinates, with no outward stub
 *   - does not follow when the connected shape moves, being pinned to absolute coordinates
 *
 * The mapping from content to world coordinates is recovered at run time from the source shape's
 * drawing coordinates and its real AABB (a translation only, since zoom=1 and there is no pan),
 * which lets the free endpoint be compared against the drop point independently of the offset.
 */

type Vec = { x: number; y: number };
type AABB = { minX: number; minY: number; maxX: number; maxY: number };

const EPS = 1.5;

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

test.describe("connector free endpoint", () => {
	test("keeps an endpoint dropped on empty space at the drop position and out of the shape's moves", async ({
		canvas,
	}) => {
		// Content drawing coordinates of the source shape; the translation offset to world
		// coordinates is recovered from these below.
		const srcContent = { minX: 300, minY: 150, maxX: 500, maxY: 250 };
		const sourceId = await canvas.drawShape(
			"Rectangle",
			{ x: srcContent.minX, y: srcContent.minY },
			{ x: srcContent.maxX, y: srcContent.maxY },
		);
		await canvas.deselect();

		// Dropping from bottomCenter onto empty space gives the target a free anchor.
		const dropContent = { x: 820, y: 520 };
		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector(
			"bottomCenter",
			dropContent,
		);
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const sourceBox = await worldAABB(canvas, sourceId);

		// Recover the content → world translation offset from the source's drawing coordinates and
		// its real AABB.
		const offsetX = sourceBox.minX - srcContent.minX;
		const offsetY = sourceBox.minY - srcContent.minY;
		const dropWorld = {
			x: dropContent.x + offsetX,
			y: dropContent.y + offsetY,
		};

		const ownedEnd = points[0];
		const freeEnd = points[points.length - 1];

		expect(
			distance(ownedEnd, { x: centerX(sourceBox), y: sourceBox.maxY }),
			"the start point lies on the source's bottom edge center",
		).toBeLessThanOrEqual(EPS);
		expect(Math.abs(points[1].x - ownedEnd.x)).toBeLessThanOrEqual(EPS);
		expect(
			points[1].y - ownedEnd.y,
			"the owned end extends a stub outward, straight down",
		).toBeGreaterThan(10);

		expect(
			distance(freeEnd, dropWorld),
			`the free end ${JSON.stringify(freeEnd)} matches the drop position ${JSON.stringify(dropWorld)}`,
		).toBeLessThanOrEqual(EPS);

		// ── Move the source: the owned end follows, the free end stays ──
		await canvas.drag({ x: 400, y: 200 }, { x: 400, y: 330 });
		await expect
			.poll(
				async () =>
					parsePoints(
						await canvas.objectById(connectorId).getAttribute("points"),
					)[0].y,
				{ message: "the owned end follows the source's move" },
			)
			.toBeGreaterThan(ownedEnd.y + 20);

		const movedPoints = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const movedFreeEnd = movedPoints[movedPoints.length - 1];
		expect(
			distance(movedFreeEnd, freeEnd),
			"the free end stays at the same absolute coordinates after the shape moves",
		).toBeLessThanOrEqual(EPS);
	});
});

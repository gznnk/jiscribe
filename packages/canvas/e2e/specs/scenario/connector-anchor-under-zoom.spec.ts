import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Creating a connector while zoomed in must still resolve the endpoints to the
 * correct world coordinates (the shape edges).
 *
 * The creation drag happens in screen coordinates and the handler converts it
 * screen->world against the current viewBox. At zoom=1 screen is nearly world,
 * so a broken conversion hides; while zoomed the endpoints drift off the edge.
 * Every other connector spec creates at zoom=1, leaving anchor resolution under
 * zoom uncovered.
 *
 * Shapes are addressed through their current screen boundingBox fed to
 * toContent, so the interaction lands on the real on-screen position even when
 * zoomed. Expected endpoints come from a world AABB derived from the element's
 * transform attribute (the model transform, which zoom does not affect); getCTM
 * folds in the viewBox scale and so disagrees with world coordinates.
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
 * World AABB of a shape, computed from the element's `transform` attribute (the
 * local->world model transform). getCTM folds in the viewBox (zoom) scale and
 * therefore does not match world coordinates while zoomed, so the local bbox is
 * transformed by the zoom-invariant `matrix(...)` instead — the same world space
 * the connector's points live in.
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

/** Whether p sits within EPS of box's perimeter (any of its edges) */
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

/** Shape center in content coordinates (screen boundingBox through toContent, so it lands on the real screen position even when zoomed) */
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

/** On-screen width of a shape, used as the signal that a zoom has been applied */
async function screenWidth(canvas: CanvasDriver, id: string): Promise<number> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot read the boundingBox of shape ${id}`);
	}
	return box.width;
}

/** World length one screen pixel spans = viewBox width / SVG screen width. 1 at zoom=1, < 1 when zoomed in. */
async function worldPerScreenPixel(canvas: CanvasDriver): Promise<number> {
	const raw = await canvas.getViewBox();
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const vbWidth = Number(raw.trim().split(/\s+/)[2]);
	const svgScreenWidth = await canvas.page.evaluate(() => {
		const svgs = [...document.querySelectorAll("svg")];
		let best = 0;
		let width = 0;
		for (const svg of svgs) {
			const rect = svg.getBoundingClientRect();
			const area = rect.width * rect.height;
			if (area > best) {
				best = area;
				width = rect.width;
			}
		}
		return width;
	});
	return vbWidth / svgScreenWidth;
}

test.describe("connector creation under zoom", () => {
	test("resolves endpoints exactly onto the shape edges when created while zoomed in", async ({
		canvas,
	}) => {
		// Two shapes close together, kept near the center so both stay on screen after zooming in.
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

		// Zoom in anchored at the midpoint between the two shapes.
		const widthBefore = await screenWidth(canvas, sourceId);
		await canvas.wheel({ x: 500, y: 375 }, { deltaY: -150, ctrl: true });
		await expect
			.poll(() => screenWidth(canvas, sourceId), {
				message: "zooming in grows the shape on screen",
			})
			.toBeGreaterThan(widthBefore + 1);

		const scale = await worldPerScreenPixel(canvas);
		// Pin down that we really zoomed in; indistinguishable from zoom=1 would make the rest vacuous.
		expect(scale).toBeLessThan(1);

		// Select source at its current zoomed screen position, then drag from bottomCenter to target.
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
		// coordinates, i.e. the screen->world conversion is right.
		expect(
			distance(points[0], { x: centerX(sourceBox), y: sourceBox.maxY }),
			`start point ${JSON.stringify(points[0])} sits on the middle of source's bottom edge (under zoom)`,
		).toBeLessThanOrEqual(EPS);

		// Dropping on the center snaps to the outline, so the end point is on the perimeter.
		expect(
			onPerimeter(points[points.length - 1], targetBox),
			`end point ${JSON.stringify(points[points.length - 1])} sits on target's perimeter (under zoom)`,
		).toBe(true);

		// Every segment is axis-aligned, i.e. the route was computed in world space too.
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

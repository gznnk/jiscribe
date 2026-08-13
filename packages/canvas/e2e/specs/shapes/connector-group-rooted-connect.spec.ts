import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Spec for connecting to a shape whose render is rooted in a <g>.
 *
 * A connector attaches to any connectable shape. The existing connector specs only use
 * Rectangle / Ellipse, both of which render as a single SVG element, leaving connections to a
 * type that draws a group — its body and its text overlay under one <g data-id> — untested.
 * Card has geometry="rect", so edge anchor resolution, snapping to the outline and following
 * should work as they do for rect; this guards that connecting works across DOM structures.
 *
 * A Card is placed at the canvas center by click placement (placeShape), so its position is read
 * at runtime with worldAABB (at zoom=1, world coordinates equal content coordinates).
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
		const root = document.querySelector(`[data-id="${targetId}"]`);
		if (!(root instanceof SVGGraphicsElement)) {
			throw new Error(`shape ${targetId} is not an SVGGraphicsElement`);
		}
		// A <g data-id> holds the body plus whatever else the type draws (a text overlay, a
		// decoration), so the bbox of the <g> can be larger than the outline. Prefer the body
		// geometry (a rect/ellipse, or a polygon without a filter) to get the AABB of the outline.
		const geom =
			root.tagName.toLowerCase() === "g"
				? ((root.querySelector(
						"rect, ellipse, polygon:not([filter])",
					) as SVGGraphicsElement | null) ?? root)
				: root;
		const el = geom;
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

const center = (box: AABB): Vec => ({
	x: (box.minX + box.maxX) / 2,
	y: (box.minY + box.maxY) / 2,
});
const centerY = (box: AABB): number => (box.minY + box.maxY) / 2;

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

test.describe("connecting a connector to a <g>-rooted shape", () => {
	test("connects a Rectangle to a Card with the endpoint sitting on the card edge and following it", async ({
		canvas,
	}) => {
		// Place a Card at the canvas center and read its actual position.
		const cardId = await canvas.placeShape("Card");
		await canvas.deselect();
		const cardBox = await worldAABB(canvas, cardId);
		const cardCenter = center(cardBox);

		// Draw a Rectangle well to the left of the Card, where they do not overlap.
		const rectId = await canvas.drawShape(
			"Rectangle",
			{ x: 120, y: cardCenter.y - 50 },
			{ x: 280, y: cardCenter.y + 50 },
		);
		await canvas.deselect();

		// Connect by dropping from the Rectangle rightCenter onto the center of the Card.
		await canvas.selectAt({ x: 200, y: cardCenter.y });
		const connectorId = await canvas.createConnector("rightCenter", cardCenter);
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const rectBox = await worldAABB(canvas, rectId);

		expect(
			distance(points[0], { x: rectBox.maxX, y: centerY(rectBox) }),
			`start point sits on the Rectangle right edge center`,
		).toBeLessThanOrEqual(EPS);

		// The end point sits on the Card outline: a drop on the center snaps to the outline.
		expect(
			onPerimeter(points[points.length - 1], cardBox),
			`end point ${JSON.stringify(points[points.length - 1])} sits on the Card perimeter`,
		).toBe(true);

		// Moving the Card drags the connector along, so it really is connected to the Card.
		const before = await canvas.objectById(connectorId).getAttribute("points");
		await canvas.drag(cardCenter, {
			x: cardCenter.x + 120,
			y: cardCenter.y + 80,
		});
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "connector follows when the Card moves",
			})
			.not.toBe(before);

		const movedPoints = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const movedCardBox = await worldAABB(canvas, cardId);
		expect(
			onPerimeter(movedPoints[movedPoints.length - 1], movedCardBox),
			"end point still sits on the perimeter of the moved Card",
		).toBe(true);
	});
});

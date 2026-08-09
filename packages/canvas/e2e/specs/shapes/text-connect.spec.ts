import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * `text` is connectable, so a connector may own it as an endpoint.
 *
 * Its box is measured from the content rather than stored, which is what makes
 * the case worth its own spec: the endpoint has to keep landing on the box as
 * the text grows, not on the box the connector was dropped against.
 *
 * Every coordinate here is read back through getCTM, which maps to the SVG
 * viewport — the same space the driver's content coordinates live in — so boxes
 * and connector points can be compared without deriving a pan offset.
 */

type Box = { left: number; top: number; width: number; height: number };
type Vec = { x: number; y: number };

/** Tolerance for comparing two coordinates that should be the same point. */
const EPS = 2;

/** How far inside the bottom edge the drop lands, well within NAMED_ANCHOR_SNAP_PX (12). */
const DROP_INSET = 5;

/** The object's box in SVG viewport coordinates. */
async function viewportBoxOf(canvas: CanvasDriver, id: string): Promise<Box> {
	return canvas.page.evaluate((objectId) => {
		const el = document.querySelector(
			`[data-kind="object"][data-id="${objectId}"]`,
		);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`object ${objectId} is not an SVGGraphicsElement`);
		}
		const bbox = el.getBBox();
		const ctm = el.getCTM();
		if (!ctm) {
			throw new Error(`CTM of object ${objectId} is not available`);
		}
		const corners = [
			{ x: bbox.x, y: bbox.y },
			{ x: bbox.x + bbox.width, y: bbox.y },
			{ x: bbox.x, y: bbox.y + bbox.height },
			{ x: bbox.x + bbox.width, y: bbox.y + bbox.height },
		].map((corner) => ({
			x: corner.x * ctm.a + corner.y * ctm.c + ctm.e,
			y: corner.x * ctm.b + corner.y * ctm.d + ctm.f,
		}));
		const xs = corners.map((corner) => corner.x);
		const ys = corners.map((corner) => corner.y);
		const left = Math.min(...xs);
		const top = Math.min(...ys);
		return {
			left,
			top,
			width: Math.max(...xs) - left,
			height: Math.max(...ys) - top,
		};
	}, id);
}

/** The connector's last vertex in SVG viewport coordinates. */
async function connectorEndOf(canvas: CanvasDriver, id: string): Promise<Vec> {
	return canvas.page.evaluate((connectorId) => {
		const el = document.querySelector(
			`polyline[data-kind="connector"][data-id="${connectorId}"]`,
		);
		if (!(el instanceof SVGGraphicsElement)) {
			throw new Error(`connector ${connectorId} is not an SVGGraphicsElement`);
		}
		const attr = el.getAttribute("points");
		if (!attr) {
			throw new Error(`connector ${connectorId} has no points attribute`);
		}
		const pairs = attr.trim().split(/\s+/);
		const [x, y] = pairs[pairs.length - 1].split(",").map(Number);
		const ctm = el.getCTM();
		if (!ctm) {
			throw new Error(`CTM of connector ${connectorId} is not available`);
		}
		return {
			x: x * ctm.a + y * ctm.c + ctm.e,
			y: x * ctm.b + y * ctm.d + ctm.f,
		};
	}, id);
}

const bottomCenterOf = (box: Box): Vec => ({
	x: box.left + box.width / 2,
	y: box.top + box.height,
});

const centerOf = (box: Box): Vec => ({
	x: box.left + box.width / 2,
	y: box.top + box.height / 2,
});

const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

test.describe("connector on a text object", () => {
	test("shows the connection anchors on a selected text", async ({
		canvas,
	}) => {
		const textId = await canvas.placeShape("Text");
		await canvas.deselect();

		await canvas.selectAt(centerOf(await viewportBoxOf(canvas, textId)));

		await expect(
			canvas.page.locator(selectors.createAnchor("leftCenter")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.createAnchor("bottomCenter")),
		).toBeVisible();
	});

	test("attaches to the text's bottom edge and follows the box as the text grows", async ({
		canvas,
	}) => {
		const textId = await canvas.placeShape("Text");
		await canvas.deselect();
		const placedText = await viewportBoxOf(canvas, textId);

		// A rect to the left of the text; the connector is dragged out of its right edge.
		const rectLeft = placedText.left - 340;
		const rectTop = placedText.top - 40;
		await canvas.drawShape(
			"Rectangle",
			{ x: rectLeft, y: rectTop },
			{ x: rectLeft + 160, y: rectTop + 80 },
		);
		await canvas.deselect();

		await canvas.selectAt({ x: rectLeft + 80, y: rectTop + 40 });
		// Just inside the bottom edge midpoint, so the endpoint takes the bottomCenter
		// connect point. A free endpoint would instead stay at this inset coordinate.
		const dropPoint = {
			x: placedText.left + placedText.width / 2,
			y: placedText.top + placedText.height - DROP_INSET,
		};
		const connectorId = await canvas.createConnector("rightCenter", dropPoint);
		await canvas.deselect();

		expect(
			distance(
				await connectorEndOf(canvas, connectorId),
				bottomCenterOf(placedText),
			),
			"the endpoint snaps to the text's bottom edge midpoint",
		).toBeLessThanOrEqual(EPS);

		// Two lines instead of one: the box gains a line height downward, and the
		// endpoint has to move with it.
		await canvas.replaceTextAt(centerOf(placedText), "Text\nsecond line");
		await canvas.commitText();

		const grownText = await viewportBoxOf(canvas, textId);
		expect(
			grownText.height,
			"the box grew when the second line was added",
		).toBeGreaterThan(placedText.height);
		expect(
			distance(
				await connectorEndOf(canvas, connectorId),
				bottomCenterOf(grownText),
			),
			"the endpoint follows the grown box's bottom edge midpoint",
		).toBeLessThanOrEqual(EPS);
	});
});

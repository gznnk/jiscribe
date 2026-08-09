import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * `svg` declares `connectable: false`, and the doc validator rejects an endpoint
 * that owns one — so the canvas must not offer the connection in the first place:
 * no anchors on a selected `svg`, and a drop onto one leaves the endpoint free.
 *
 * The shape has no toolbar entry, so the pair is injected through the harness's
 * doc hook. Coordinates are read back through getCTM, which maps to the SVG
 * viewport — the space the driver's content coordinates live in.
 */

type Box = { left: number; top: number; width: number; height: number };
type Vec = { x: number; y: number };

const EPS = 2;

const docText = JSON.stringify({
	version: 1,
	root: [
		{ id: "src-rect", type: "rect", x: 150, y: 300, width: 160, height: 100 },
		{
			id: "logo-svg",
			type: "svg",
			x: 620,
			y: 260,
			width: 200,
			height: 180,
			svgText:
				'<svg viewBox="0 0 10 10"><rect x="0" y="0" width="10" height="10" fill="#888888" /></svg>',
		},
	],
});

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

const centerOf = (box: Box): Vec => ({
	x: box.left + box.width / 2,
	y: box.top + box.height / 2,
});

const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

async function loadDoc(canvas: CanvasDriver) {
	await canvas.page.evaluate((text) => {
		const hook = (
			window as unknown as { __setHarnessDoc?: (docText: string) => void }
		).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(text);
	}, docText);
	await expect(canvas.objectById("src-rect")).toHaveCount(1);
	await expect(canvas.objectById("logo-svg")).toHaveCount(1);
}

test.describe("no connection to an svg", () => {
	test("shows no connection anchors on a selected svg", async ({ canvas }) => {
		await loadDoc(canvas);

		// selectAt asserts a control handle appeared, so the absence below is not vacuous:
		// the shape really is selected and only the connection anchors are missing.
		await canvas.selectAt(centerOf(await viewportBoxOf(canvas, "logo-svg")));

		await expect(
			canvas.page.locator(selectors.createAnchor("leftCenter")),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.createAnchor("rightCenter")),
		).toHaveCount(0);

		// Positive control: a connectable shape in the same document does show them.
		await canvas.deselect();
		await canvas.selectAt(centerOf(await viewportBoxOf(canvas, "src-rect")));
		await expect(
			canvas.page.locator(selectors.createAnchor("rightCenter")),
		).toBeVisible();
	});

	test("leaves the endpoint free when dropped onto an svg", async ({
		canvas,
	}) => {
		await loadDoc(canvas);
		const svgBox = await viewportBoxOf(canvas, "logo-svg");
		const rectBox = await viewportBoxOf(canvas, "src-rect");

		// Away from the svg's center, so a wrong connection would be visible as a snap to it.
		const dropPoint = {
			x: svgBox.left + svgBox.width - 20,
			y: svgBox.top + svgBox.height - 20,
		};
		await canvas.selectAt(centerOf(rectBox));
		const connectorId = await canvas.createConnector("rightCenter", dropPoint);
		await canvas.deselect();

		const endpoint = await connectorEndOf(canvas, connectorId);
		expect(
			distance(endpoint, dropPoint),
			"the endpoint stays at the drop coordinate (free)",
		).toBeLessThanOrEqual(EPS);
		expect(
			distance(endpoint, centerOf(svgBox)),
			"the endpoint is not snapped to the svg's center",
		).toBeGreaterThan(20);

		// Moving the svg does not drag the endpoint along, i.e. nothing is attached.
		// Grabbed near its bottom-left corner, clear of both connector segments, so the
		// drag moves the shape rather than a segment of the line.
		const grabPoint = {
			x: svgBox.left + 25,
			y: svgBox.top + svgBox.height - 25,
		};
		await canvas.drag(grabPoint, { x: grabPoint.x, y: grabPoint.y + 180 });
		expect(
			distance(await connectorEndOf(canvas, connectorId), endpoint),
			"the endpoint does not follow when the svg moves",
		).toBeLessThanOrEqual(EPS);
	});
});

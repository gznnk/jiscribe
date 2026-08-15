import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures";
import {
	dispatchTouch,
	enableTouch,
	flushFrames,
} from "../../support/cdpTouch";

/**
 * Guards gestureHandling="cooperative", the value a canvas embedded in a
 * scrolling document takes so the reader is not stranded on it.
 *
 * On the wheel, the split runs between scrolling and zooming: a plain wheel has
 * to reach the page and leave the view alone, while Ctrl+wheel still has to zoom
 * the canvas and leave the page alone. A preventDefault that stayed
 * unconditional, and a cooperative mode that dropped the Ctrl case along with
 * the rest, both survive a test that only checks one of the two.
 *
 * On touch, the split runs by what the finger lands on: a one-finger background
 * drag scrolls the page (and must not also pan the viewport), a one-finger drag
 * on a shape drags the shape to the end without the page taking it away halfway,
 * and two fingers pan/zoom the view. The shape half rides on the touchstart
 * guard (useCooperativeTouchClaim) because browsers ignore touch-action on inner
 * SVG elements — CSS alone passes a test the real page fails.
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** The drawing region of the embedded canvas, excluding the toolbar above it. */
const viewportLocator = (page: Page) =>
	page.locator('[data-testid="embedded-canvas"] [data-kind="canvas"]');

/**
 * The embedded canvas's pan/zoom, as its main svg's viewBox. Scoped below
 * [data-kind="canvas"] so the toolbar's 24×24 icons cannot be picked up instead.
 */
async function readViewBox(page: Page) {
	const raw = await viewportLocator(page)
		.locator("svg")
		.first()
		.getAttribute("viewBox");
	return parseViewBox(raw);
}

/** Center of the drawing region in screen coordinates. */
async function canvasCenter(page: Page) {
	const box = await viewportLocator(page).boundingBox();
	if (!box) {
		throw new Error("the embedded canvas has no box");
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

const WHEEL_DELTA_Y = 200;

/** Opens the harness with the embedded canvas on screen and measured. */
async function openPageScrollHarness(page: Page) {
	await page.goto("/?pageScroll", { waitUntil: "networkidle" });
	// The canvas has to be on screen for the gesture to land on it, and the page
	// has to still have room left to scroll further.
	await page
		.locator('[data-testid="embedded-canvas"]')
		.scrollIntoViewIfNeeded();
	// A viewBox as wide as the region rules out having latched onto an icon svg,
	// which would make an unchanged viewBox mean nothing.
	await expect
		.poll(async () => (await readViewBox(page)).width, {
			message: "the canvas svg is mounted and measured",
		})
		.toBeGreaterThan(100);
}

test.describe("gestureHandling=cooperative", () => {
	test.beforeEach(async ({ page }) => {
		await openPageScrollHarness(page);
	});

	test("a plain wheel over the canvas scrolls the page and leaves the view alone", async ({
		page,
	}) => {
		const before = await readViewBox(page);
		const scrollBefore = await page.evaluate(() => window.scrollY);

		const center = await canvasCenter(page);
		await page.mouse.move(center.x, center.y);
		await page.mouse.wheel(0, WHEEL_DELTA_Y);

		await expect
			.poll(() => page.evaluate(() => window.scrollY), {
				message: "the wheel reaches the page",
			})
			.toBeGreaterThan(scrollBefore);

		// The canvas view never moved: same origin, same zoom.
		const after = await readViewBox(page);
		expect(after.minX).toBeCloseTo(before.minX, 3);
		expect(after.minY).toBeCloseTo(before.minY, 3);
		expect(after.width).toBeCloseTo(before.width, 3);
	});

	test("Ctrl+wheel still zooms the canvas and leaves the page alone", async ({
		page,
	}) => {
		const before = await readViewBox(page);
		const scrollBefore = await page.evaluate(() => window.scrollY);

		const center = await canvasCenter(page);
		await page.mouse.move(center.x, center.y);
		await page.keyboard.down("Control");
		await page.mouse.wheel(0, -WHEEL_DELTA_Y);
		await page.keyboard.up("Control");

		// Zooming in shrinks the viewBox, which is the zoom factor's only DOM readout.
		await expect
			.poll(async () => (await readViewBox(page)).width, {
				message: "Ctrl+wheel zooms the canvas",
			})
			.toBeLessThan(before.width);

		expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
	});
});

test.describe("gestureHandling=cooperative on touch", () => {
	test.beforeEach(async ({ page }) => {
		await openPageScrollHarness(page);
	});

	test("a one-finger background drag scrolls the page and never pans the view", async ({
		page,
	}) => {
		const client = await enableTouch(page);
		const before = await readViewBox(page);
		const scrollBefore = await page.evaluate(() => window.scrollY);

		// A background point: right half of the region, far from the embedded rect
		// (which sits near the region's top-left).
		const box = await viewportLocator(page).boundingBox();
		if (!box) {
			throw new Error("the embedded canvas has no box");
		}
		const start = { x: box.x + box.width * 0.7, y: box.y + box.height * 0.6 };

		await dispatchTouch(client, "touchStart", [{ ...start, id: 1 }]);
		await flushFrames(page);
		// One touchMove to the final position (see the cdpTouch caveats). Dragging
		// the finger up scrolls the page further down, exactly like a real reader.
		await dispatchTouch(client, "touchMove", [
			{ x: start.x, y: start.y - 250, id: 1 },
		]);
		await expect
			.poll(() => page.evaluate(() => window.scrollY), {
				message: "the background touch drag reaches the page scroll",
			})
			.toBeGreaterThan(scrollBefore);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);

		// The viewport never moved — the drag was neither taken as a canvas pan
		// before the browser claimed it, nor after.
		const after = await readViewBox(page);
		expect(after.minX).toBeCloseTo(before.minX, 3);
		expect(after.minY).toBeCloseTo(before.minY, 3);
		expect(after.width).toBeCloseTo(before.width, 3);
	});

	test("a one-finger drag on a shape drags the shape to the end and leaves the page alone", async ({
		page,
	}) => {
		const client = await enableTouch(page);
		const before = await readViewBox(page);
		const scrollBefore = await page.evaluate(() => window.scrollY);

		const shape = page.locator('[data-kind="object"][data-id="rect-embedded"]');
		const shapeBox = await shape.boundingBox();
		if (!shapeBox) {
			throw new Error("the embedded rect has no box");
		}
		const grab = {
			x: shapeBox.x + shapeBox.width / 2,
			y: shapeBox.y + shapeBox.height / 2,
		};

		await dispatchTouch(client, "touchStart", [{ ...grab, id: 1 }]);
		await flushFrames(page);
		await dispatchTouch(client, "touchMove", [
			{ x: grab.x + 60, y: grab.y + 80, id: 1 },
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);

		// The shape followed the finger for the whole drag. With the browser
		// claiming the touch as a page scroll this dies halfway on pointercancel,
		// which is exactly what the touchstart guard exists to prevent.
		await expect
			.poll(async () => (await shape.boundingBox())?.x, {
				message: "the shape follows the finger",
			})
			.toBeCloseTo(shapeBox.x + 60, 0);
		expect((await shape.boundingBox())?.y).toBeCloseTo(shapeBox.y + 80, 0);

		expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
		const after = await readViewBox(page);
		expect(after.minX).toBeCloseTo(before.minX, 3);
		expect(after.minY).toBeCloseTo(before.minY, 3);
	});

	test("a two-finger pinch still pans and zooms the view and leaves the page alone", async ({
		page,
	}) => {
		const client = await enableTouch(page);
		const before = await readViewBox(page);
		const scrollBefore = await page.evaluate(() => window.scrollY);

		const box = await viewportLocator(page).boundingBox();
		if (!box) {
			throw new Error("the embedded canvas has no box");
		}
		const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

		// First finger lands, the second joins before it moves — a pinch, the one
		// gesture cooperative still hands the view on touch.
		await dispatchTouch(client, "touchStart", [{ ...center, id: 1 }]);
		await flushFrames(page);
		await dispatchTouch(client, "touchStart", [
			{ ...center, id: 1 },
			{ x: center.x + 100, y: center.y, id: 2 },
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchMove", [
			{ ...center, id: 1 },
			{ x: center.x + 200, y: center.y, id: 2 },
		]);
		await flushFrames(page);

		await expect
			.poll(async () => (await readViewBox(page)).width, {
				message: "the pinch zooms the canvas",
			})
			.toBeCloseTo(before.width / 2, 3);

		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);

		expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
	});
});

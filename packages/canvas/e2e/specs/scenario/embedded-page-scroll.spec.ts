import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures";

/**
 * Guards gestureHandling="cooperative", the value a canvas embedded in a
 * scrolling document takes so the reader is not stranded on it.
 *
 * The split it makes is between scrolling and zooming, not between the wheel and
 * everything else: a plain wheel has to reach the page and leave the view alone,
 * while Ctrl+wheel still has to zoom the canvas and leave the page alone. A
 * preventDefault that stayed unconditional, and a cooperative mode that dropped
 * the Ctrl case along with the rest, both survive a test that only checks one of
 * the two.
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

test.describe("gestureHandling=cooperative", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/?pageScroll", { waitUntil: "networkidle" });
		// The canvas has to be on screen for the wheel to land on it, and the page
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

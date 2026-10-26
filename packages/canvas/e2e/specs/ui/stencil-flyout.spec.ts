import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The stencil flyout: the panel a pinned category's rail button opens over the
 * canvas.
 *
 * - The button opens it with the category's presets (the same
 *   `data-action="item:<presetId>"` contract as the rail's), and toggles it shut.
 * - Its presets go through the existing StencilLibraryItemHandler as is: a click
 *   enters drawing mode, a drag onto the canvas places the shape.
 * - It floats over the canvas: opening it leaves the viewport's size and the
 *   drawing's place on screen alone.
 * - It closes on the pointerup that picks a shape, on a press on the canvas, on
 *   Escape, and on a press over the rail's or the toolbar's empty area.
 *
 * The subject is the flyout mechanism, not any one shape set, so the category comes
 * from the harness's test-only plugin (e2e/plugins/specShapesPlugin), pinned there.
 */

/** The test-only plugin's category, holding the single `tile` preset. */
const SPEC_CATEGORY = "spec";

/**
 * A viewport point that hits `selector`'s element itself, not one of its
 * buttons. Scans the element's midline along `axis` and takes the middle of the
 * gaps, so it holds whatever layout the harness mounts.
 */
async function emptyPointOf(
	canvas: CanvasDriver,
	selector: string,
	axis: "x" | "y",
): Promise<{ x: number; y: number }> {
	return canvas.page.locator(selector).evaluate((el, scanAxis) => {
		const box = el.getBoundingClientRect();
		const hits: { x: number; y: number }[] = [];
		if (scanAxis === "x") {
			const y = box.top + box.height / 2;
			for (let x = box.left + 2; x < box.right - 2; x += 4) {
				if (document.elementFromPoint(x, y) === el) {
					hits.push({ x, y });
				}
			}
		} else {
			const x = box.left + box.width / 2;
			for (let y = box.top + 2; y < box.bottom - 2; y += 4) {
				if (document.elementFromPoint(x, y) === el) {
					hits.push({ x, y });
				}
			}
		}
		if (hits.length === 0) {
			throw new Error("the element has no empty area at this viewport size");
		}
		return hits[Math.floor(hits.length / 2)];
	}, axis);
}

async function openSpecFlyout(canvas: CanvasDriver) {
	await canvas.page.click(selectors.categoryButton(SPEC_CATEGORY));
	await expect(
		canvas.page.locator(selectors.categoryPanel(SPEC_CATEGORY)),
	).toBeVisible();
}

async function expectFlyoutClosed(canvas: CanvasDriver) {
	await expect(
		canvas.page.locator(selectors.categoryPanel(SPEC_CATEGORY)),
	).toHaveCount(0);
}

test.describe("Stencil flyout", () => {
	test("opens from the pinned category's rail button and toggles shut", async ({
		canvas,
	}) => {
		const button = canvas.page.locator(selectors.categoryButton(SPEC_CATEGORY));
		await expectFlyoutClosed(canvas);
		await expect(button).toHaveAttribute("aria-expanded", "false");

		await openSpecFlyout(canvas);
		await expect(button).toHaveAttribute("aria-expanded", "true");
		await expect(canvas.page.locator(selectors.stencilFlyout)).toBeVisible();
		await expect(
			canvas.page.locator(selectors.shapeItem("tile")),
		).toBeVisible();

		await button.click();
		await expectFlyoutClosed(canvas);
		await expect(button).toHaveAttribute("aria-expanded", "false");
	});

	test("enters drawing mode from an item, closing on pointerup, and draws", async ({
		canvas,
	}) => {
		await openSpecFlyout(canvas);

		const before = (await canvas.captureObjects()).length;
		await canvas.page.locator(selectors.shapeItem("tile")).click();
		await expect
			.poll(() => canvas.isDrawingMode(), {
				message: "clicking a shape in the flyout enters drawing mode",
			})
			.toBe(true);
		await expectFlyoutClosed(canvas);

		// Drag onto the canvas to actually create it (inside, clear of the edge zones)
		await canvas.drag({ x: 360, y: 240 }, { x: 520, y: 360 });
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "a new shape is created through the flyout",
			})
			.toBe(before + 1);
	});

	test("places a shape dragged out of it, closing as the drag starts", async ({
		canvas,
	}) => {
		await openSpecFlyout(canvas);

		const before = (await canvas.captureObjects()).length;
		// Right of the flyout's 280px, so the drop lands on uncovered canvas.
		const to = canvas.toScreen({ x: 500, y: 320 });

		// hover() presses from the item's own center, so the drag needs no measuring
		await canvas.page.locator(selectors.shapeItem("tile")).hover();
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(to.x, to.y, { steps: 12 });
			await expectFlyoutClosed(canvas);
		} finally {
			await canvas.page.mouse.up();
		}

		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "the D&D out of the flyout places a new shape",
			})
			.toBe(before + 1);
	});

	test("floats over the canvas: the viewport keeps its size and the drawing its place", async ({
		canvas,
	}) => {
		// Clear of the flyout's width, so the asserted shape is one it does not cover.
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 340, y: 150 },
			{ x: 460, y: 240 },
		);
		const viewport = canvas.page.locator('[data-kind="canvas"]');
		const viewportBefore = await viewport.boundingBox();
		const shapeBefore = await canvas.objectById(id).boundingBox();

		await openSpecFlyout(canvas);

		expect(await viewport.boundingBox()).toEqual(viewportBefore);
		expect(await canvas.objectById(id).boundingBox()).toEqual(shapeBefore);
		// It sits against the rail, over the canvas's left edge.
		const flyoutBox = await canvas.page
			.locator(selectors.stencilFlyout)
			.boundingBox();
		expect(flyoutBox?.x).toBe(viewportBefore?.x);
	});

	test("closes on Escape and on a press on the canvas", async ({ canvas }) => {
		await openSpecFlyout(canvas);
		await canvas.page.keyboard.press("Escape");
		await expectFlyoutClosed(canvas);

		await openSpecFlyout(canvas);
		const empty = canvas.toScreen({ x: 700, y: 600 });
		await canvas.page.mouse.click(empty.x, empty.y);
		await expectFlyoutClosed(canvas);
	});

	test("stays open on a press inside it", async ({ canvas }) => {
		await openSpecFlyout(canvas);

		const header = await canvas.page
			.locator(`${selectors.stencilFlyout} > div:nth-child(1)`)
			.boundingBox();
		if (!header) {
			throw new Error("the flyout has no header");
		}
		await canvas.page.mouse.click(header.x + 20, header.y + header.height / 2);
		await expect(
			canvas.page.locator(selectors.categoryPanel(SPEC_CATEGORY)),
		).toBeVisible();
	});

	for (const [area, selector, axis] of [
		["rail", selectors.rail, "y"],
		["toolbar", selectors.toolbar, "x"],
	] as const) {
		test(`closes on a press over the ${area}'s empty area`, async ({
			canvas,
		}) => {
			await openSpecFlyout(canvas);

			const empty = await emptyPointOf(canvas, selector, axis);
			await canvas.page.mouse.move(empty.x, empty.y);
			await canvas.page.mouse.down();
			await expectFlyoutClosed(canvas);
			await canvas.page.mouse.up();
		});
	}
});

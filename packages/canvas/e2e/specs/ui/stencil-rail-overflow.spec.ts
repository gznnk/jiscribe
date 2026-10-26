import type { Page } from "@playwright/test";

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The rail when it is too short for everything it holds:
 *
 * - What does not fit goes into a "…" button above the catalog button, whose
 *   title counts it: the document's categories first, then the pins from the
 *   end of the pin order.
 * - A category opened from "…" is on the rail while it is shown.
 * - Shorter still, the presets fold into one button whose popover draws as the
 *   rail does.
 * - Pins are reordered by dragging them, on the rail and in the "…" popover,
 *   and the host hears the new order.
 *
 * The harness (e2e/harness/main.tsx) puts eight presets on the rail and pins
 * `spec`; each test pins `basic` after it from the catalog and loads a document
 * using `mixed` (a panel), so the rail holds two pins and one document category.
 */

const SPEC_CATEGORY = "spec";
const BASIC_CATEGORY = "basic";
const MIXED_CATEGORY = "mixed";

/** The harness page's height (createCanvasPlaywrightConfig). */
const FULL_VIEWPORT = { width: 1440, height: 900 };

const panelDocText = JSON.stringify({
	version: 1,
	root: [
		{ id: "panel-1", type: "panel", x: 600, y: 60, width: 60, height: 40 },
	],
});

async function loadDoc(canvas: CanvasDriver, docText: string) {
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
}

/** The ids behind the `toggle:<id>` actions under `selector`, in DOM order. */
async function categoryIdsOf(page: Page, selector: string): Promise<string[]> {
	return page
		.locator(selector)
		.evaluateAll((elements) =>
			elements.map((element) =>
				(element.getAttribute("data-action") ?? "").slice("toggle:".length),
			),
		);
}

/** Lets a resize reach the rail's ResizeObserver and the render it causes paint. */
async function settleLayout(page: Page) {
	await page.evaluate(
		() =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			),
	);
}

/**
 * Shortens the page a few px at a time from its current height until
 * `isReached` holds, so a spec finds the height at which the rail changes
 * without restating the rail's sizes.
 */
async function shrinkUntil(page: Page, isReached: () => Promise<boolean>) {
	const startHeight = page.viewportSize()?.height ?? FULL_VIEWPORT.height;
	for (let height = startHeight; height >= 120; height -= 4) {
		await page.setViewportSize({ width: FULL_VIEWPORT.width, height });
		await settleLayout(page);
		if (await isReached()) {
			return;
		}
	}
	throw new Error("the rail never reached the state asked for");
}

/** Pins `basic` after the harness's `spec` and loads a document using `mixed`. */
async function fillRail(canvas: CanvasDriver) {
	await canvas.openCatalog();
	await canvas.page.hover(selectors.catalogRow(BASIC_CATEGORY));
	await canvas.page.click(selectors.catalogPin(BASIC_CATEGORY));
	await canvas.closeStencilPanel();
	await loadDoc(canvas, panelDocText);
	await expect(canvas.objectById("panel-1")).toHaveCount(1);
	expect(
		await categoryIdsOf(canvas.page, selectors.railCategoryButtons("pinned")),
	).toEqual([SPEC_CATEGORY, BASIC_CATEGORY]);
	expect(
		await categoryIdsOf(canvas.page, selectors.railCategoryButtons("document")),
	).toEqual([MIXED_CATEGORY]);
	await expect(canvas.page.locator(selectors.railMoreButton)).toHaveCount(0);
}

/** Presses `from`, drags it onto `to` in steps the recognizer reads as a drag, and releases. */
async function dragOnto(
	page: Page,
	fromSelector: string,
	toSelector: string,
	whileOver?: () => Promise<void>,
) {
	const fromBox = await page.locator(fromSelector).boundingBox();
	const toBox = await page.locator(toSelector).boundingBox();
	if (fromBox === null || toBox === null) {
		throw new Error("drag endpoints are not laid out");
	}
	await page.mouse.move(
		fromBox.x + fromBox.width / 2,
		fromBox.y + fromBox.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, {
		steps: 8,
	});
	await settleLayout(page);
	await whileOver?.();
	await page.mouse.up();
}

/** The "…" button's title, or null while the rail shows no "…" button. */
async function moreButtonTitle(page: Page): Promise<string | null> {
	const moreButton = page.locator(selectors.railMoreButton);
	return (await moreButton.count()) === 0
		? null
		: moreButton.getAttribute("title");
}

async function lastReportedPins(page: Page): Promise<string[] | undefined> {
	return page.evaluate(() => {
		const changes = (
			window as unknown as { __pinnedCategoryChanges?: string[][] }
		).__pinnedCategoryChanges;
		return changes?.[changes.length - 1];
	});
}

test.describe("Stencil rail overflow", () => {
	test.afterEach(async ({ canvas }) => {
		await canvas.page.setViewportSize(FULL_VIEWPORT);
	});

	test("moves the document's categories into the '…' button first, then the pins from the end", async ({
		canvas,
	}) => {
		await fillRail(canvas);
		const page = canvas.page;
		const moreButton = page.locator(selectors.railMoreButton);

		await shrinkUntil(page, async () => (await moreButton.count()) > 0);
		await expect(moreButton).toHaveAttribute("title", "1 more category");
		expect(
			await categoryIdsOf(page, selectors.railCategoryButtons("document")),
		).toEqual([]);
		expect(
			await categoryIdsOf(page, selectors.railCategoryButtons("pinned")),
		).toEqual([SPEC_CATEGORY, BASIC_CATEGORY]);

		await shrinkUntil(
			page,
			async () => (await moreButtonTitle(page)) === "2 more categories",
		);
		expect(
			await categoryIdsOf(page, selectors.railCategoryButtons("pinned")),
		).toEqual([SPEC_CATEGORY]);

		await moreButton.click();
		await expect(page.locator(selectors.railOverflowPopover)).toBeVisible();
		expect(
			await categoryIdsOf(page, selectors.railOverflowRows("pinned")),
		).toEqual([BASIC_CATEGORY]);
		expect(
			await categoryIdsOf(page, selectors.railOverflowRows("document")),
		).toEqual([MIXED_CATEGORY]);
		// The popover closes the way the flyout does: a press on the canvas.
		await canvas.clickAt({ x: 400, y: 40 });
		await expect(page.locator(selectors.railOverflowPopover)).toHaveCount(0);
	});

	test("keeps a category opened from '…' on the rail while it is shown", async ({
		canvas,
	}) => {
		await fillRail(canvas);
		const page = canvas.page;
		const moreButton = page.locator(selectors.railMoreButton);
		await shrinkUntil(
			page,
			async () => (await moreButtonTitle(page)) === "2 more categories",
		);

		await moreButton.click();
		await page
			.locator(selectors.railOverflowRows("pinned"))
			.filter({ hasText: "Basic" })
			.click();
		await expect(
			page.locator(selectors.categoryPanel(BASIC_CATEGORY)),
		).toBeVisible();
		await expect(page.locator(selectors.railOverflowPopover)).toHaveCount(0);
		// In the last pin's place, which goes into "…" instead.
		expect(
			await categoryIdsOf(page, selectors.railCategoryButtons("pinned")),
		).toEqual([BASIC_CATEGORY]);
		await expect(
			page.locator(selectors.categoryButton(BASIC_CATEGORY)),
		).toHaveAttribute("aria-expanded", "true");

		await canvas.closeStencilPanel();
		await settleLayout(page);
		expect(
			await categoryIdsOf(page, selectors.railCategoryButtons("pinned")),
		).toEqual([SPEC_CATEGORY]);
	});

	test("folds the presets into one button only once every category is in '…', and draws from its popover", async ({
		canvas,
	}) => {
		await fillRail(canvas);
		const page = canvas.page;
		const presetsButton = page.locator(selectors.railPresetsButton);
		await shrinkUntil(
			page,
			async () => (await moreButtonTitle(page)) === "3 more categories",
		);
		await expect(presetsButton).toHaveCount(0);
		await expect(page.locator(selectors.toolButton("Rectangle"))).toBeVisible();

		await shrinkUntil(page, async () => (await presetsButton.count()) > 0);
		await expect(page.locator(selectors.toolButton("Rectangle"))).toHaveCount(
			0,
		);
		await expect(presetsButton).toHaveAttribute("title", "Basic shapes");
		await expect(page.locator(selectors.catalogButton)).toBeVisible();
		// The room the fold frees brings the categories back.
		expect(
			await categoryIdsOf(page, selectors.railCategoryButtons("pinned")),
		).toEqual([SPEC_CATEGORY, BASIC_CATEGORY]);

		await presetsButton.click();
		await page.click(selectors.railPresetsPopoverItem("rect"));
		await expect
			.poll(() => canvas.isDrawingMode(), {
				message: "the rect from the popover arms drawing",
			})
			.toBe(true);
		const before = (await canvas.captureObjects()).length;
		await canvas.drag({ x: 200, y: 20 }, { x: 260, y: 60 });
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before + 1);
	});

	test("reorders the pins by dragging one onto another on the rail, a line marking where it lands", async ({
		canvas,
	}) => {
		await fillRail(canvas);
		const page = canvas.page;

		await dragOnto(
			page,
			selectors.categoryButton(BASIC_CATEGORY),
			selectors.categoryButton(SPEC_CATEGORY),
			async () => {
				await expect(
					page.locator(selectors.categoryButton(SPEC_CATEGORY)),
				).toHaveAttribute("data-pin-insertion", "before");
			},
		);

		await expect
			.poll(() => categoryIdsOf(page, selectors.railCategoryButtons("pinned")))
			.toEqual([BASIC_CATEGORY, SPEC_CATEGORY]);
		expect(await lastReportedPins(page)).toEqual([
			BASIC_CATEGORY,
			SPEC_CATEGORY,
		]);
		// A drag is not a click: no panel opened.
		await expect(page.locator(selectors.stencilPanel)).toHaveCount(0);
	});

	test("reorders the pins inside the '…' popover", async ({ canvas }) => {
		await fillRail(canvas);
		const page = canvas.page;
		// Pinning `mixed` too leaves three pins and no document category.
		await canvas.openCatalog();
		await page.hover(selectors.catalogRow(MIXED_CATEGORY));
		await page.click(selectors.catalogPin(MIXED_CATEGORY));
		await canvas.closeStencilPanel();
		const moreButton = page.locator(selectors.railMoreButton);
		await shrinkUntil(
			page,
			async () => (await moreButtonTitle(page)) === "2 more categories",
		);

		await moreButton.click();
		await expect(page.locator(selectors.railOverflowPopover)).toBeVisible();
		expect(
			await categoryIdsOf(page, selectors.railOverflowRows("pinned")),
		).toEqual([BASIC_CATEGORY, MIXED_CATEGORY]);
		const rowOf = (categoryId: string) =>
			`${selectors.railOverflowPopover} [data-action="toggle:${categoryId}"]`;
		await dragOnto(page, rowOf(MIXED_CATEGORY), rowOf(BASIC_CATEGORY));

		await expect
			.poll(() => categoryIdsOf(page, selectors.railOverflowRows("pinned")))
			.toEqual([MIXED_CATEGORY, BASIC_CATEGORY]);
		expect(await lastReportedPins(page)).toEqual([
			SPEC_CATEGORY,
			MIXED_CATEGORY,
			BASIC_CATEGORY,
		]);
	});
});

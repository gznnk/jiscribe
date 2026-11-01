import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The shape library's "show all" view (`StencilCategory.browseGroups`), in the
 * sidebar and in the stencil bar's Other shapes popover.
 *
 * - A section whose category declares browse groups offers "Show all" under
 *   its grid; it opens a view of that category alone: a back button, the one
 *   search box, and the groups as collapsible sections, only the first open.
 * - Its items are the library's own: a click places a click-placed shape (the
 *   sidebar stays in the view, the popover closes as on any item), and a drag
 *   onto the canvas creates the shape.
 * - Its search looks in that category alone; the back button returns to the
 *   sections and to the button that opened the view.
 *
 * The category is the harness's test-only `spec-browse`
 * (e2e/plugins/specShapesPlugin): `places` holds the click-placed `pin` and
 * `memo`, `draws` the drag-drawn `tile` and `brick`.
 */

const BROWSE_SECTION = "spec-browse";
const FIRST_GROUP = "places";
const SECOND_GROUP = "draws";

/** Drags an item onto the canvas and waits for the shape it creates. */
async function dragOntoCanvas(canvas: CanvasDriver, itemSelector: string) {
	const before = (await canvas.captureObjects()).length;
	// Well inside the canvas and clear of the edge zones (auto-scroll)
	const to = canvas.toScreen({ x: 500, y: 320 });
	await canvas.page.locator(itemSelector).hover();
	await canvas.page.mouse.down();
	try {
		await canvas.page.mouse.move(to.x, to.y, { steps: 12 });
	} finally {
		await canvas.page.mouse.up();
	}
	await expect
		.poll(async () => (await canvas.captureObjects()).length, {
			message: "the drag out of the show all view creates a shape",
		})
		.toBe(before + 1);
}

/** Clicks a click-placed item and waits for the shape it places. */
async function clickToPlace(canvas: CanvasDriver, itemSelector: string) {
	const before = (await canvas.captureObjects()).length;
	await canvas.page.click(itemSelector);
	await expect
		.poll(async () => (await canvas.captureObjects()).length, {
			message: "a click on a click-placed item places the shape",
		})
		.toBe(before + 1);
}

test.describe("Shape library show all view, in the sidebar", () => {
	test("opens a category in full, its first group alone open, and goes back", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		const panel = canvas.page.locator(selectors.stencilLibraryPanel);
		const showAll = canvas.page.locator(
			selectors.stencilLibraryShowAll(BROWSE_SECTION),
		);
		const back = canvas.page.locator(selectors.stencilLibraryBack);

		// Offered by the one section declaring browse groups, in place of the
		// pointer to the search (that section declares no `search` anyway)
		await expect(
			panel.locator('[data-testid^="stencil-library-show-all-"]'),
		).toHaveCount(1);
		await expect(showAll).toHaveText("Show all ›");

		await showAll.click();
		await expect(back).toBeFocused();
		await expect(back).toHaveAttribute("aria-label", "Back to shape library");
		await expect(panel.locator('[data-action^="section:"]')).toHaveCount(0);
		await expect(panel.locator('input[type="text"]')).toHaveCount(1);
		await expect(
			canvas.page.locator(selectors.stencilLibraryBrowseGroup(FIRST_GROUP)),
		).toHaveAttribute("aria-expanded", "true");
		const secondGroup = canvas.page.locator(
			selectors.stencilLibraryBrowseGroup(SECOND_GROUP),
		);
		await expect(secondGroup).toHaveAttribute("aria-expanded", "false");
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanelItem("pin")),
		).toBeVisible();
		const tileItem = canvas.page.locator(
			selectors.stencilLibraryPanelItem("tile"),
		);
		await expect(tileItem).toHaveCount(0);

		await secondGroup.click();
		await expect(secondGroup).toHaveAttribute("aria-expanded", "true");
		await expect(tileItem).toBeVisible();

		await back.click();
		await expect(back).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.stencilLibrarySection(BROWSE_SECTION)),
		).toBeVisible();
		await expect(showAll).toBeFocused();
	});

	test("places a shape from a group by click and stays in the view", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		await canvas.page.click(selectors.stencilLibraryShowAll(BROWSE_SECTION));

		await clickToPlace(canvas, selectors.stencilLibraryPanelItem("pin"));
		await expect(
			canvas.page.locator(selectors.stencilLibraryBack),
		).toBeVisible();
	});

	test("creates a shape dragged out of a group", async ({ canvas }) => {
		await canvas.openStencilLibrary();
		await canvas.page.click(selectors.stencilLibraryShowAll(BROWSE_SECTION));
		await canvas.page.click(selectors.stencilLibraryBrowseGroup(SECOND_GROUP));

		await dragOntoCanvas(canvas, selectors.stencilLibraryPanelItem("tile"));
		await expect(
			canvas.page.locator(selectors.stencilLibraryBack),
		).toBeVisible();
	});

	test("searches the category alone, and clearing the query brings the groups back", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		const search = canvas.page.locator(selectors.stencilLibrarySearch);
		await search.fill("e");
		// Out of the view, the query reaches the other sections too
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanelItem("rect")),
		).toBeVisible();
		await search.fill("");

		await canvas.page.click(selectors.stencilLibraryShowAll(BROWSE_SECTION));
		await expect(search).toHaveValue("");
		await search.fill("e");
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanelItem("memo")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanelItem("tile")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanelItem("rect")),
		).toHaveCount(0);

		await search.fill("");
		await expect(
			canvas.page.locator(selectors.stencilLibraryBrowseGroup(FIRST_GROUP)),
		).toBeVisible();
	});
});

test.describe("Shape library show all view, in the Other shapes popover", () => {
	async function openBrowseInPopover(canvas: CanvasDriver) {
		await canvas.page.click(selectors.stencilBarOtherShapes);
		await expect(
			canvas.page.locator(selectors.otherShapesPopover),
		).toBeVisible();
		await canvas.page.click(
			selectors.otherShapesPopoverShowAll(BROWSE_SECTION),
		);
		await expect(
			canvas.page.locator(selectors.otherShapesPopoverBack),
		).toBeFocused();
	}

	test("places a shape from a group by click, which closes the popover", async ({
		canvas,
	}) => {
		await openBrowseInPopover(canvas);
		await expect(
			canvas.page.locator(selectors.otherShapesPopoverBrowseGroup(FIRST_GROUP)),
		).toHaveAttribute("aria-expanded", "true");

		await clickToPlace(canvas, selectors.otherShapesPopoverItem("pin"));
		await expect(canvas.page.locator(selectors.otherShapesPopover)).toHaveCount(
			0,
		);
	});

	test("creates a shape dragged out of a group", async ({ canvas }) => {
		await openBrowseInPopover(canvas);
		await canvas.page.click(
			selectors.otherShapesPopoverBrowseGroup(SECOND_GROUP),
		);

		await dragOntoCanvas(canvas, selectors.otherShapesPopoverItem("tile"));
	});

	test("goes back to the sections from the back button", async ({ canvas }) => {
		await openBrowseInPopover(canvas);

		await canvas.page.click(selectors.otherShapesPopoverBack);
		await expect(
			canvas.page.locator(selectors.otherShapesPopoverSection(BROWSE_SECTION)),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.otherShapesPopoverShowAll(BROWSE_SECTION)),
		).toBeFocused();
	});

	test("still closes on Escape", async ({ canvas }) => {
		await openBrowseInPopover(canvas);

		await canvas.page.keyboard.press("Escape");
		await expect(canvas.page.locator(selectors.otherShapesPopover)).toHaveCount(
			0,
		);
	});
});
